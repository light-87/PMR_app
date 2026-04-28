'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Workflow } from 'lucide-react'

const TEST_PHONE = '9000000099'
const TEST_PIN = '1234'
const TEST_NAME = 'Phase1 Tester'
const TEST_SALARY = 15000

type Step = {
  id: string
  label: string
  status: 'pending' | 'running' | 'ok' | 'error'
  detail?: string
}

type PaymentType = 'REGULAR' | 'ADVANCE' | 'ADJUSTMENT'

function nowMonth(): string {
  const d = new Date()
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000)
  const y = ist.getUTCFullYear()
  const m = (ist.getUTCMonth() + 1).toString().padStart(2, '0')
  return `${y}-${m}`
}

export function FlowTestCard() {
  const [steps, setSteps] = useState<Step[]>([])
  const [busy, setBusy] = useState(false)
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [calculated, setCalculated] = useState<number | null>(null)
  const [amount, setAmount] = useState<string>('')
  const [type, setType] = useState<PaymentType>('REGULAR')
  const [error, setError] = useState('')

  function update(id: string, patch: Partial<Step>) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function add(step: Step) {
    setSteps((prev) => [...prev, step])
  }

  async function call<T = unknown>(
    url: string,
    init?: RequestInit
  ): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
    const res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
    let data: T | null = null
    try {
      data = (await res.json()) as T
    } catch {}
    if (!res.ok) {
      return { ok: false, status: res.status, data, error: (data as { error?: string })?.error ?? `HTTP ${res.status}` }
    }
    return { ok: true, status: res.status, data }
  }

  async function ensureEmployee() {
    add({ id: 'employee', label: '1. Test employee', status: 'running' })

    // Try create; if 409 it already exists — fetch the list and find it.
    type CreatedEmployee = { id: string; name: string; phone: string }
    const create = await call<{ data: CreatedEmployee }>('/api/employee', {
      method: 'POST',
      body: JSON.stringify({
        name: TEST_NAME,
        phone: TEST_PHONE,
        pin: TEST_PIN,
        monthlySalary: TEST_SALARY,
      }),
    })

    if (create.ok && create.data?.data) {
      setEmployeeId(create.data.data.id)
      update('employee', { status: 'ok', detail: `Created (${create.data.data.id})` })
      return create.data.data.id
    }

    if (create.status === 409) {
      type ListItem = { id: string; phone: string; name: string }
      const list = await call<{ data: ListItem[] }>('/api/employee?includeInactive=true')
      const match = list.data?.data?.find((e) => e.phone === TEST_PHONE)
      if (match) {
        setEmployeeId(match.id)
        update('employee', { status: 'ok', detail: `Reusing (${match.id})` })
        return match.id
      }
    }

    update('employee', { status: 'error', detail: create.error ?? 'Failed' })
    throw new Error(create.error ?? 'create failed')
  }

  async function adminMark(empId: string) {
    add({ id: 'mark', label: '2. Mark PRESENT today (admin manual)', status: 'running' })
    const r = await call('/api/employee/attendance/admin-mark', {
      method: 'POST',
      body: JSON.stringify({ employeeId: empId, status: 'PRESENT' }),
    })
    if (!r.ok) {
      update('mark', { status: 'error', detail: r.error })
      throw new Error(r.error)
    }
    update('mark', { status: 'ok', detail: 'PRESENT, approved' })
  }

  async function calc(empId: string) {
    add({ id: 'calc', label: '3. Calculate suggested salary', status: 'running' })
    type CalcData = { calculatedAmount: string; daysAttended: number; daysInMonth: number }
    const r = await call<{ data: CalcData }>(
      `/api/employee/salary/calculate?employeeId=${empId}&month=${nowMonth()}`
    )
    if (!r.ok || !r.data?.data) {
      update('calc', { status: 'error', detail: r.error })
      throw new Error(r.error ?? 'calc failed')
    }
    const c = r.data.data
    const num = Number(c.calculatedAmount)
    setCalculated(num)
    if (!amount) setAmount(String(num.toFixed(2)))
    update('calc', {
      status: 'ok',
      detail: `${c.daysAttended} day(s) × ₹${(TEST_SALARY / c.daysInMonth).toFixed(0)}/day = ₹${num.toFixed(2)}`,
    })
  }

  async function pay(empId: string) {
    const numAmount = parseFloat(amount)
    if (Number.isNaN(numAmount)) {
      setError('Enter a valid amount')
      return
    }
    add({ id: 'pay', label: `4. Pay ₹${numAmount} (${type})`, status: 'running' })
    type PayData = { pushStatus: string; expense: { id: string }; payment: { id: string } }
    const r = await call<{ data: PayData }>('/api/employee/salary/pay', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: empId,
        month: nowMonth(),
        amountPaid: numAmount,
        type,
        account: 'CASH',
      }),
    })
    if (!r.ok || !r.data?.data) {
      update('pay', { status: 'error', detail: r.error })
      return
    }
    const p = r.data.data
    update('pay', {
      status: 'ok',
      detail: `payment=${p.payment.id} expense=${p.expense.id} push=${p.pushStatus}`,
    })
  }

  async function runAll() {
    setError('')
    setBusy(true)
    setSteps([])
    setCalculated(null)
    try {
      const id = await ensureEmployee()
      await adminMark(id)
      await calc(id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Flow failed')
    } finally {
      setBusy(false)
    }
  }

  async function runPay() {
    if (!employeeId) {
      setError('Run setup steps first')
      return
    }
    setBusy(true)
    setError('')
    try {
      await pay(employeeId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Pay failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Workflow className="h-4 w-4" /> End-to-End Flow Test
        </CardTitle>
        <CardDescription>
          Drives the production Phase 1 admin APIs. Creates a test employee (phone {TEST_PHONE},
          PIN {TEST_PIN}), marks today PRESENT, calculates salary, then lets you pay any amount.
          For employee-side push validation, log into /staff/login on a separate browser/device
          (Phase 3 UI not built yet).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Requires <code>prisma/sql/pagarbook.sql</code> to have been executed in Supabase first.
          If you get 500 errors here, that&apos;s the cause.
        </div>

        <Button onClick={runAll} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Run setup (steps 1-3)
        </Button>

        {steps.length > 0 && (
          <ol className="space-y-1.5 text-sm">
            {steps.map((s) => (
              <li key={s.id} className="flex gap-2">
                <span
                  className={
                    s.status === 'ok'
                      ? 'text-green-700'
                      : s.status === 'error'
                        ? 'text-red-600'
                        : s.status === 'running'
                          ? 'text-blue-600'
                          : 'text-muted-foreground'
                  }
                >
                  {s.status === 'ok' ? '✓' : s.status === 'error' ? '✗' : s.status === 'running' ? '…' : '·'}
                </span>
                <div className="flex-1">
                  <div className="font-medium">{s.label}</div>
                  {s.detail && <div className="text-xs text-muted-foreground">{s.detail}</div>}
                </div>
              </li>
            ))}
          </ol>
        )}

        {calculated !== null && employeeId && (
          <div className="space-y-3 pt-3 border-t">
            <div className="text-xs text-muted-foreground">
              Suggested ₹{calculated.toFixed(2)}. Override below or pay as advance.
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="pay-amount" className="text-xs">Amount (₹)</Label>
                <Input
                  id="pay-amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as PaymentType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REGULAR">Regular</SelectItem>
                    <SelectItem value="ADVANCE">Advance</SelectItem>
                    <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={runPay} disabled={busy} variant="default">
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Pay ₹{amount || '0'} ({type})
            </Button>
          </div>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}
      </CardContent>
    </Card>
  )
}
