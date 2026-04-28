'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, Loader2, PartyPopper } from 'lucide-react'
import { formatINR, paymentStatus, type PaymentStatus } from '@/lib/utils'
import { toMonthStringIST } from '@/lib/date-utils'
import { KpiStrip, type KpiFilter } from '@/components/payroll/KpiStrip'
import { FilterBar, type StatusFilter, type SortKey } from '@/components/payroll/FilterBar'
import {
  EmployeePayrollCard,
  type EmployeePayrollRow,
} from '@/components/payroll/EmployeePayrollCard'
import {
  PaySheet,
  type PaySheetContext,
  type PaymentType,
  type PaySuccessResult,
} from '@/components/payroll/PaySheet'
import { toast } from '@/store/toastStore'

type EmployeeApiRow = {
  id: string
  name: string
  phone: string
  monthlySalary: string
}

type CalcApiRow = {
  daysAttended: number
  daysInMonth: number
  calculatedAmount: string
  totalEarned: string
  totalPaid: string
  runningBalance: string
  paidThisMonth: string
  lastPayment: { amount: string; type: string; paidDate: string } | null
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

export default function PayrollPage() {
  const [month, setMonth] = useState<string>(toMonthStringIST(new Date()))
  const [employees, setEmployees] = useState<EmployeeApiRow[]>([])
  const [calcs, setCalcs] = useState<Record<string, CalcApiRow>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [flashId, setFlashId] = useState<string | null>(null)
  const [pushById, setPushById] = useState<Record<string, EmployeePayrollRow['pushStatus']>>({})

  // Filters
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [sort, setSort] = useState<SortKey>('AMOUNT_DESC')

  // Pay sheet
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetCtx, setSheetCtx] = useState<PaySheetContext | null>(null)

  useEffect(() => {
    void loadAll()
  }, [month])

  async function loadAll() {
    setLoading(true)
    setLoadError('')
    try {
      const empRes = await fetch('/api/employee')
      const empJson = await empRes.json()
      if (!empJson.success) throw new Error(empJson.error || 'Failed to load employees')
      const list: EmployeeApiRow[] = empJson.data
      setEmployees(list)

      const entries = await Promise.all(
        list.map(async (e) => {
          const r = await fetch(`/api/employee/salary/calculate?employeeId=${e.id}&month=${month}`)
          const j = await r.json()
          return j.success ? ([e.id, j.data as CalcApiRow] as const) : null
        })
      )
      const calcMap: Record<string, CalcApiRow> = {}
      for (const entry of entries) {
        if (!entry) continue
        calcMap[entry[0]] = entry[1]
      }
      setCalcs(calcMap)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  // Refresh just one employee's calc — used after pay for optimistic update.
  async function refreshOne(employeeId: string) {
    try {
      const r = await fetch(
        `/api/employee/salary/calculate?employeeId=${employeeId}&month=${month}`
      )
      const j = await r.json()
      if (j.success) {
        setCalcs((prev) => ({ ...prev, [employeeId]: j.data }))
      }
    } catch {
      // Non-fatal — full data will be correct on next loadAll.
    }
  }

  // Build the rich rows used by UI/filters/sort.
  const rows: EmployeePayrollRow[] = useMemo(() => {
    return employees.map((e) => {
      const c = calcs[e.id]
      const monthlySalary = Number(e.monthlySalary)
      if (!c) {
        return {
          id: e.id,
          name: e.name,
          phone: e.phone,
          monthlySalary,
          daysAttended: 0,
          daysInMonth: 30,
          calculatedAmount: 0,
          paidThisMonth: 0,
          runningBalance: 0,
          status: 'PENDING' as PaymentStatus,
          lastPayment: null,
        }
      }
      const calcAmt = Number(c.calculatedAmount)
      const paidThisMonth = Number(c.paidThisMonth)
      const balance = Number(c.runningBalance)
      const status = paymentStatus(balance, paidThisMonth, calcAmt)
      return {
        id: e.id,
        name: e.name,
        phone: e.phone,
        monthlySalary,
        daysAttended: c.daysAttended,
        daysInMonth: c.daysInMonth,
        calculatedAmount: calcAmt,
        paidThisMonth,
        runningBalance: balance,
        status,
        lastPayment: c.lastPayment
          ? {
              amount: Number(c.lastPayment.amount),
              type: c.lastPayment.type,
              paidDate: c.lastPayment.paidDate,
            }
          : null,
        pushStatus: pushById[e.id] ?? null,
        flashGreen: flashId === e.id,
      }
    })
  }, [employees, calcs, flashId, pushById])

  // Apply filter chip from KPI tile.
  const [kpiFilter, setKpiFilter] = useState<KpiFilter>('ALL')

  function handleKpiFilter(f: KpiFilter) {
    setKpiFilter(f)
    if (f === 'ALL') setStatusFilter('ALL')
    else if (f === 'PAID') setStatusFilter('PAID')
    else if (f === 'PENDING') setStatusFilter('PENDING')
  }

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    let out = rows.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q) && !r.phone.includes(q)) return false
      if (statusFilter === 'ALL') return true
      return r.status === statusFilter
    })
    out = [...out].sort((a, b) => {
      if (sort === 'NAME_ASC') return a.name.localeCompare(b.name)
      if (sort === 'DAYS_DESC') return b.daysAttended - a.daysAttended
      // AMOUNT_DESC — pending first by amount-due
      const aDue = Math.max(a.calculatedAmount - a.paidThisMonth, 0)
      const bDue = Math.max(b.calculatedAmount - b.paidThisMonth, 0)
      return bDue - aDue
    })
    return out
  }, [rows, query, statusFilter, sort])

  // KPI sums
  const kpis = useMemo(() => {
    let payable = 0
    let paid = 0
    let pendingCount = 0
    for (const r of rows) {
      payable += r.calculatedAmount
      paid += r.paidThisMonth
      if (r.status === 'PENDING' || r.status === 'PARTIAL') pendingCount++
    }
    return { payable, paid, pendingCount, totalCount: rows.length }
  }, [rows])

  const allDone =
    rows.length > 0 && rows.every((r) => r.status === 'PAID' || r.status === 'OVERPAID')

  function openSheet(row: EmployeePayrollRow, mode: 'FULL' | 'CUSTOM' | 'ADJUST') {
    const owed = Math.max(row.calculatedAmount - row.paidThisMonth, 0)
    setSheetCtx({
      employeeId: row.id,
      employeeName: row.name,
      month,
      monthLabel: monthLabel(month),
      initialAmount: mode === 'ADJUST' ? 0 : owed > 0 ? owed : row.calculatedAmount,
      calculatedAmount: row.calculatedAmount,
      paidThisMonth: row.paidThisMonth,
      initialType: mode === 'ADJUST' ? 'ADJUSTMENT' : 'REGULAR',
    })
    setSheetOpen(true)
  }

  function handlePaySuccess(result: PaySuccessResult) {
    if (!sheetCtx) return
    const empId = sheetCtx.employeeId
    const empName = sheetCtx.employeeName

    setPushById((prev) => ({ ...prev, [empId]: result.pushStatus }))

    void refreshOne(empId).then(() => {
      setFlashId(empId)
      setTimeout(() => setFlashId((cur) => (cur === empId ? null : cur)), 1500)
    })

    const pushHint =
      result.pushStatus === 'sent'
        ? '🔔 Notified'
        : result.pushStatus === 'no-subscription'
          ? '🔕 Not subscribed'
          : result.pushStatus === 'expired'
            ? '🔕 Subscription expired'
            : '🔕 Push failed'

    toast.success(`Paid ${formatINR(result.amountPaid)} to ${empName}`, {
      description: `${result.type.toLowerCase()} · ${pushHint}`,
    })
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Header — sticky-able month switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payroll</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Pay salaries & track balances</p>
        </div>
        <div className="flex items-center gap-1 self-start sm:self-auto rounded-lg border bg-card p-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setMonth(shiftMonth(month, -1))}
            aria-label="Previous month"
            className="h-9 w-9"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-semibold text-sm w-32 text-center tabular-nums">
            {monthLabel(month)}
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setMonth(shiftMonth(month, 1))}
            aria-label="Next month"
            className="h-9 w-9"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-md bg-rose-50 border border-rose-200 text-rose-800 p-3 text-sm">
          {loadError}
        </div>
      )}

      {/* KPI strip */}
      {!loading && employees.length > 0 && (
        <KpiStrip
          payable={kpis.payable}
          paid={kpis.paid}
          pendingCount={kpis.pendingCount}
          totalCount={kpis.totalCount}
          active={kpiFilter}
          onFilter={handleKpiFilter}
        />
      )}

      {/* Filter bar */}
      {!loading && employees.length > 0 && (
        <FilterBar
          query={query}
          onQueryChange={setQuery}
          status={statusFilter}
          onStatusChange={(s) => {
            setStatusFilter(s)
            setKpiFilter(s === 'ALL' ? 'ALL' : s === 'PAID' ? 'PAID' : s === 'PENDING' ? 'PENDING' : 'ALL')
          }}
          sort={sort}
          onSortChange={setSort}
        />
      )}

      {/* Body */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-4 w-32 bg-slate-200 rounded mb-3" />
              <div className="h-2 w-full bg-slate-100 rounded mb-3" />
              <div className="h-10 w-full bg-slate-100 rounded" />
            </Card>
          ))}
          <div className="flex items-center justify-center text-xs text-muted-foreground gap-2 pt-2">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading payroll…
          </div>
        </div>
      ) : employees.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No active employees.{' '}
          <Link className="underline font-medium" href="/employee/new">
            Add one
          </Link>
          .
        </Card>
      ) : (
        <>
          {allDone && (
            <Card className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <PartyPopper className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-bold text-emerald-900">
                    All {rows.length} employees paid for {monthLabel(month)}
                  </div>
                  <div className="text-xs text-emerald-700 mt-0.5 tabular-nums">
                    {formatINR(kpis.paid)} dispensed
                  </div>
                </div>
              </div>
            </Card>
          )}

          <div className="space-y-3">
            {filteredRows.length === 0 ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                No employees match the current filter.
              </Card>
            ) : (
              filteredRows.map((row) => (
                <EmployeePayrollCard
                  key={row.id}
                  row={row}
                  onPayFull={(r) => openSheet(r, 'FULL')}
                  onPayCustom={(r) => openSheet(r, 'CUSTOM')}
                  onPayAdjust={(r) => openSheet(r, 'ADJUST')}
                />
              ))
            )}
          </div>
        </>
      )}

      <PaySheet
        open={sheetOpen}
        ctx={sheetCtx}
        onOpenChange={setSheetOpen}
        onSuccess={handlePaySuccess}
      />
    </div>
  )
}
