'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Loader2,
  Users,
  ClipboardCheck,
  IndianRupee,
  AlertTriangle,
  Calendar,
  CameraOff,
  ArrowUpDown,
  Download,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { toMonthStringIST } from '@/lib/date-utils'
import { downloadOverallReport, type OverallReportPayload } from '../lib/report'

type Resp = {
  month: string
  kpis: {
    activeCount: number
    totalCount: number
    todayPresent: number
    todayTotal: number
    labourCostThisMonth: string
    totalPending: string
    pendingSelfMarks: number
    noFaceCount: number
    overpaidCount: number
  }
  byEmployee: {
    id: string
    name: string
    monthlySalary: string
    daysAttended: number
    daysInMonth: number
    calculatedAmount: string
    paidThisMonth: string
    balance: string
    hasFace: boolean
  }[]
  heatmap: {
    daysInMonth: number
    rows: { id: string; name: string; days: number[] }[]
  }
  trend: { month: string; total: string }[]
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export default function EmployeeDashboardPage() {
  const [month, setMonth] = useState<string>(toMonthStringIST(new Date()))
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  async function downloadOverall() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/employee/report?month=${month}`)
      const json = await res.json()
      if (!json.success) {
        alert(json.error || 'Failed')
        return
      }
      downloadOverallReport(json.data as OverallReportPayload)
    } finally {
      setDownloading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [month])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/employee/dashboard?month=${month}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed')
      setData(json.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    )
  }
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!data) return null

  const totalPending = Number(data.kpis.totalPending)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={downloadOverall} disabled={downloading}>
            {downloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download report
          </Button>
          <Button size="sm" variant="outline" onClick={() => setMonth(shiftMonth(month, -1))}>
            ←
          </Button>
          <div className="font-medium text-sm w-24 text-center">{month}</div>
          <Button size="sm" variant="outline" onClick={() => setMonth(shiftMonth(month, 1))}>
            →
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi
          icon={Users}
          label="Active employees"
          value={String(data.kpis.activeCount)}
          sublabel={
            data.kpis.totalCount > data.kpis.activeCount
              ? `${data.kpis.totalCount - data.kpis.activeCount} inactive`
              : undefined
          }
        />
        <Kpi
          icon={ClipboardCheck}
          label="Today's attendance"
          value={`${data.kpis.todayPresent}/${data.kpis.todayTotal}`}
          sublabel="present today"
          tone={data.kpis.todayPresent === data.kpis.todayTotal ? 'positive' : undefined}
        />
        <Kpi
          icon={IndianRupee}
          label="Labour cost"
          value={`₹${formatCurrency(Number(data.kpis.labourCostThisMonth))}`}
          sublabel={`paid in ${month}`}
        />
        <Kpi
          icon={ArrowUpDown}
          label={totalPending >= 0 ? 'Pending balance' : 'Overpaid balance'}
          value={`₹${formatCurrency(Math.abs(totalPending))}`}
          sublabel="across all staff"
          tone={totalPending >= 0 ? 'warning' : 'info'}
        />
      </div>

      {/* Alerts */}
      {(data.kpis.pendingSelfMarks > 0 ||
        data.kpis.noFaceCount > 0 ||
        data.kpis.overpaidCount > 0) && (
        <div className="flex flex-wrap gap-2">
          {data.kpis.pendingSelfMarks > 0 && (
            <Link href="/employee/pending">
              <Alert
                icon={AlertTriangle}
                tone="amber"
                text={`${data.kpis.pendingSelfMarks} pending self-mark${data.kpis.pendingSelfMarks === 1 ? '' : 's'} — approve`}
              />
            </Link>
          )}
          {data.kpis.noFaceCount > 0 && (
            <Alert
              icon={CameraOff}
              tone="muted"
              text={`${data.kpis.noFaceCount} employee${data.kpis.noFaceCount === 1 ? '' : 's'} with no face enrolled`}
            />
          )}
          {data.kpis.overpaidCount > 0 && (
            <Alert
              icon={ArrowUpDown}
              tone="blue"
              text={`${data.kpis.overpaidCount} employee${data.kpis.overpaidCount === 1 ? '' : 's'} overpaid (carry forward)`}
            />
          )}
        </div>
      )}

      {/* Trend chart */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold">Labour cost — last 6 months</div>
            <div className="text-xs text-muted-foreground">Total paid per IST month</div>
          </div>
        </div>
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.trend.map((t) => ({ month: t.month, total: Number(t.total) }))}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: number) => [`₹${formatCurrency(v)}`, 'Labour cost']}
                contentStyle={{ fontSize: '12px' }}
              />
              <Bar dataKey="total" fill="#1976D2" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Heat-map */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold">Attendance — {month}</div>
            <div className="text-xs text-muted-foreground">
              Each row = employee · cols = day of month
            </div>
          </div>
          <div className="text-[10px] flex flex-wrap gap-2">
            <HeatLegend color="bg-green-500/40" label="Present" />
            <HeatLegend color="bg-red-500/40" label="Absent" />
            <HeatLegend color="bg-amber-500/50" label="Pending" />
            <HeatLegend color="bg-muted" label="—" />
          </div>
        </div>
        {data.heatmap.rows.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">No employees yet.</div>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="text-xs border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-background pr-2 font-normal text-muted-foreground text-left z-10">
                    Employee
                  </th>
                  {Array.from({ length: data.heatmap.daysInMonth }).map((_, i) => (
                    <th key={i} className="px-0.5 font-normal text-muted-foreground text-center w-5">
                      {i + 1}
                    </th>
                  ))}
                  <th className="sticky right-0 bg-background pl-3 pr-1 font-normal text-muted-foreground text-right z-10">
                    Present
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.heatmap.rows.map((row) => {
                  const presentCount = row.days.reduce((n, v) => n + ((v & 7) === 2 ? 1 : 0), 0)
                  return (
                    <tr key={row.id}>
                      <td className="sticky left-0 bg-background pr-2 py-1 z-10">
                        <Link
                          href={`/employee/${row.id}`}
                          className="hover:underline whitespace-nowrap"
                        >
                          {row.name}
                        </Link>
                      </td>
                      {row.days.map((v, i) => (
                        <td key={i} className="p-0.5">
                          <div
                            className={cn(
                              'w-4 h-4 rounded-sm relative',
                              heatColor(v),
                              v & 8 ? 'ring-1 ring-purple-500' : ''
                            )}
                            title={heatTitle(v, i + 1)}
                          />
                        </td>
                      ))}
                      <td className="sticky right-0 bg-background pl-3 pr-1 text-right tabular-nums font-semibold z-10">
                        {presentCount}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Per-employee table */}
      <Card className="p-4">
        <div className="text-sm font-semibold mb-3">Per-employee summary — {month}</div>
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="text-left py-2 pr-2 font-normal">Employee</th>
                <th className="text-right py-2 px-2 font-normal">Days</th>
                <th className="text-right py-2 px-2 font-normal">Calculated</th>
                <th className="text-right py-2 px-2 font-normal">Paid (this month)</th>
                <th className="text-right py-2 pl-2 font-normal">Balance</th>
              </tr>
            </thead>
            <tbody>
              {data.byEmployee.map((e) => {
                const balance = Number(e.balance)
                return (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="py-2 pr-2">
                      <Link href={`/employee/${e.id}`} className="hover:underline">
                        {e.name}
                      </Link>
                      {!e.hasFace && (
                        <span
                          className="ml-2 text-[10px] text-muted-foreground inline-flex items-center gap-1"
                          title="No face enrolled"
                        >
                          <CameraOff className="h-3 w-3" />
                        </span>
                      )}
                    </td>
                    <td className="text-right py-2 px-2 tabular-nums">
                      {e.daysAttended}/{e.daysInMonth}
                    </td>
                    <td className="text-right py-2 px-2 tabular-nums">
                      ₹{formatCurrency(Number(e.calculatedAmount))}
                    </td>
                    <td className="text-right py-2 px-2 tabular-nums">
                      ₹{formatCurrency(Number(e.paidThisMonth))}
                    </td>
                    <td
                      className={cn(
                        'text-right py-2 pl-2 tabular-nums font-medium',
                        balance > 0 && 'text-amber-700',
                        balance < 0 && 'text-emerald-700'
                      )}
                    >
                      {balance < 0 ? '-' : ''}₹{formatCurrency(Math.abs(balance))}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="text-[10px] text-muted-foreground mt-3 flex flex-wrap gap-3">
          <span>Balance: positive = pending, negative = overpaid (across all months).</span>
          <Link href="/employee/payroll" className="text-primary hover:underline ml-auto">
            Go to Payroll →
          </Link>
        </div>
      </Card>
    </div>
  )
}

function Kpi({
  icon: Icon,
  label,
  value,
  sublabel,
  tone,
}: {
  icon: typeof Users
  label: string
  value: string
  sublabel?: string
  tone?: 'positive' | 'warning' | 'info'
}) {
  return (
    <Card
      className={cn(
        'p-3',
        tone === 'positive' && 'border-green-300 bg-green-50',
        tone === 'warning' && 'border-amber-300 bg-amber-50',
        tone === 'info' && 'border-blue-300 bg-blue-50'
      )}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-xl font-bold mt-1 tabular-nums">{value}</div>
      {sublabel && <div className="text-[10px] text-muted-foreground">{sublabel}</div>}
    </Card>
  )
}

function Alert({
  icon: Icon,
  text,
  tone,
}: {
  icon: typeof AlertTriangle
  text: string
  tone: 'amber' | 'blue' | 'muted'
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border',
        tone === 'amber' && 'border-amber-300 bg-amber-50 text-amber-800',
        tone === 'blue' && 'border-blue-300 bg-blue-50 text-blue-800',
        tone === 'muted' && 'border bg-muted/40 text-muted-foreground'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {text}
    </div>
  )
}

function HeatLegend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn('h-2.5 w-2.5 rounded-sm', color)} />
      <span className="text-muted-foreground">{label}</span>
    </span>
  )
}

function heatColor(v: number): string {
  const status = v & 7
  if (status === 2) return 'bg-green-500/40'
  if (status === 3) return 'bg-red-500/40'
  if (status === 1) return 'bg-amber-500/50'
  return 'bg-muted'
}

function heatTitle(v: number, day: number): string {
  const status = v & 7
  const modified = !!(v & 8)
  let label = '—'
  if (status === 2) label = 'Present'
  else if (status === 3) label = 'Absent'
  else if (status === 1) label = 'Pending approval'
  return `Day ${day}: ${label}${modified ? ' (modified)' : ''}`
}
