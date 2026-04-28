'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, IndianRupee } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { toMonthStringIST } from '@/lib/date-utils'

type EmployeeRow = {
  id: string
  name: string
  phone: string
  monthlySalary: string
}

type CalcRow = {
  employeeId: string
  daysAttended: number
  daysInMonth: number
  calculatedAmount: string
  totalEarned: string
  totalPaid: string
  runningBalance: string
}

type PaymentType = 'REGULAR' | 'ADVANCE' | 'ADJUSTMENT'

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`
}

export default function PayrollPage() {
  const [month, setMonth] = useState<string>(toMonthStringIST(new Date()))
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [calcs, setCalcs] = useState<Record<string, CalcRow>>({})
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [types, setTypes] = useState<Record<string, PaymentType>>({})
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void loadAll()
  }, [month])

  async function loadAll() {
    setLoading(true)
    setMessage('')
    setError('')
    try {
      const empRes = await fetch('/api/employee')
      const empJson = await empRes.json()
      if (!empJson.success) throw new Error(empJson.error || 'Failed')
      const list: EmployeeRow[] = empJson.data
      setEmployees(list)

      const calcEntries = await Promise.all(
        list.map(async (e) => {
          const r = await fetch(`/api/employee/salary/calculate?employeeId=${e.id}&month=${month}`)
          const j = await r.json()
          return j.success ? ([e.id, j.data] as const) : null
        })
      )
      const calcMap: Record<string, CalcRow> = {}
      const amountInit: Record<string, string> = {}
      const typeInit: Record<string, PaymentType> = {}
      for (const entry of calcEntries) {
        if (!entry) continue
        const [empId, data] = entry
        calcMap[empId] = data
        amountInit[empId] = Number(data.calculatedAmount).toFixed(2)
        typeInit[empId] = 'REGULAR'
      }
      setCalcs(calcMap)
      setAmounts(amountInit)
      setTypes(typeInit)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  async function pay(empId: string) {
    const amount = parseFloat(amounts[empId] ?? '0')
    if (Number.isNaN(amount)) {
      alert('Invalid amount')
      return
    }
    if (
      !confirm(
        `Pay ₹${formatCurrency(amount)} (${types[empId]}) to ${
          employees.find((e) => e.id === empId)?.name ?? 'employee'
        } for ${month}?`
      )
    )
      return
    setPaying(empId)
    setMessage('')
    try {
      const res = await fetch('/api/employee/salary/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: empId,
          month,
          amountPaid: amount,
          type: types[empId] ?? 'REGULAR',
          account: 'CASH',
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error || 'Pay failed')
        return
      }
      setMessage(
        `Paid ₹${formatCurrency(amount)} to ${
          employees.find((e) => e.id === empId)?.name ?? '?'
        }. Push: ${json.data.pushStatus}.`
      )
      void loadAll()
    } finally {
      setPaying(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Payroll</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setMonth(shiftMonth(month, -1))}>
            ←
          </Button>
          <div className="font-medium text-sm w-24 text-center">{month}</div>
          <Button size="sm" variant="outline" onClick={() => setMonth(shiftMonth(month, 1))}>
            →
          </Button>
        </div>
      </div>

      {message && (
        <div className="text-sm rounded-md bg-green-50 border border-green-200 text-green-800 p-3">
          {message}
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : employees.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No active employees. <Link className="underline" href="/employee/new">Add one</Link>.
        </Card>
      ) : (
        <div className="space-y-3">
          {employees.map((e) => {
            const calc = calcs[e.id]
            const balance = calc ? Number(calc.runningBalance) : 0
            const perDay = calc ? Number(e.monthlySalary) / calc.daysInMonth : 0
            return (
              <Card key={e.id} className="p-4 space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <Link href={`/employee/${e.id}`} className="font-medium hover:underline">
                      {e.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      ₹{formatCurrency(Number(e.monthlySalary))}/month
                    </div>
                  </div>
                  <div
                    className={cn(
                      'text-xs',
                      balance >= 0 ? 'text-amber-700' : 'text-blue-700'
                    )}
                  >
                    {balance >= 0 ? 'Pending' : 'Overpaid'} ₹{formatCurrency(Math.abs(balance))}
                  </div>
                </div>

                {calc && (
                  <div className="text-xs text-muted-foreground">
                    {calc.daysAttended}/{calc.daysInMonth} days × ₹{perDay.toFixed(0)}/day = suggested ₹
                    {formatCurrency(Number(calc.calculatedAmount))}
                  </div>
                )}

                <div className="grid sm:grid-cols-3 gap-2 items-end">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Amount (₹)</label>
                    <Input
                      value={amounts[e.id] ?? ''}
                      onChange={(ev) => setAmounts((prev) => ({ ...prev, [e.id]: ev.target.value }))}
                      inputMode="decimal"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Type</label>
                    <Select
                      value={types[e.id] ?? 'REGULAR'}
                      onValueChange={(v) => setTypes((prev) => ({ ...prev, [e.id]: v as PaymentType }))}
                    >
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
                  <Button onClick={() => pay(e.id)} disabled={paying === e.id}>
                    {paying === e.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <IndianRupee className="h-4 w-4 mr-2" />
                    )}
                    Pay
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
