'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { IndianRupee, Pencil, ArrowRightLeft, Bell, BellOff, Phone } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusPill } from './StatusPill'
import { cn, formatINR, type PaymentStatus } from '@/lib/utils'

export interface EmployeePayrollRow {
  id: string
  name: string
  phone: string
  monthlySalary: number
  daysAttended: number
  daysInMonth: number
  calculatedAmount: number
  paidThisMonth: number
  runningBalance: number
  status: PaymentStatus
  lastPayment: { amount: number; type: string; paidDate: string } | null
  pushStatus?: 'sent' | 'no-subscription' | 'expired' | 'error' | null
  flashGreen?: boolean
}

interface Props {
  row: EmployeePayrollRow
  onPayFull: (row: EmployeePayrollRow) => void
  onPayCustom: (row: EmployeePayrollRow) => void
  onPayAdjust: (row: EmployeePayrollRow) => void
}

const TYPE_LABELS: Record<string, string> = {
  REGULAR: 'regular',
  ADVANCE: 'advance',
  ADJUSTMENT: 'adjustment',
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    })
  } catch {
    return iso
  }
}

export function EmployeePayrollCard({ row, onPayFull, onPayCustom, onPayAdjust }: Props) {
  const [flashing, setFlashing] = useState(false)

  useEffect(() => {
    if (row.flashGreen) {
      setFlashing(true)
      const t = setTimeout(() => setFlashing(false), 1200)
      return () => clearTimeout(t)
    }
  }, [row.flashGreen])

  const attendancePct =
    row.daysInMonth > 0 ? Math.min(100, Math.round((row.daysAttended / row.daysInMonth) * 100)) : 0
  const owedThisMonth = Math.max(row.calculatedAmount - row.paidThisMonth, 0)
  const pillAmount =
    row.status === 'PENDING'
      ? row.calculatedAmount
      : row.status === 'PARTIAL'
        ? owedThisMonth
        : row.status === 'OVERPAID'
          ? Math.abs(row.runningBalance)
          : row.paidThisMonth

  return (
    <Card
      className={cn(
        'p-4 space-y-3 transition-colors duration-700',
        flashing && 'bg-emerald-50 ring-2 ring-emerald-400'
      )}
    >
      {/* Top row: name + status pill */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/employee/${row.id}`}
            className="font-semibold text-base hover:underline block truncate"
          >
            {row.name}
          </Link>
          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
            <span className="tabular-nums">{formatINR(row.monthlySalary)}/mo</span>
            <span className="opacity-50">·</span>
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3" /> {row.phone}
            </span>
          </div>
        </div>
        <StatusPill status={row.status} amount={pillAmount} />
      </div>

      {/* Attendance bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>
            <span className="font-semibold text-foreground tabular-nums">
              {row.daysAttended}/{row.daysInMonth}
            </span>{' '}
            days attended
          </span>
          <span className="tabular-nums">{attendancePct}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              attendancePct >= 90
                ? 'bg-emerald-500'
                : attendancePct >= 60
                  ? 'bg-amber-500'
                  : 'bg-rose-400'
            )}
            style={{ width: `${attendancePct}%` }}
          />
        </div>
      </div>

      {/* Last paid + push */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {row.lastPayment ? (
          <span>
            Last paid{' '}
            <span className="font-semibold text-foreground tabular-nums">
              {formatINR(Number(row.lastPayment.amount))}
            </span>{' '}
            <span className="opacity-80">
              {TYPE_LABELS[row.lastPayment.type] ?? row.lastPayment.type.toLowerCase()}
            </span>{' '}
            · {formatDate(row.lastPayment.paidDate)}
          </span>
        ) : (
          <span className="italic">No payments yet</span>
        )}
        {row.pushStatus === 'sent' && (
          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
            <Bell className="h-3 w-3" /> Notified
          </span>
        )}
        {row.pushStatus && row.pushStatus !== 'sent' && (
          <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">
            <BellOff className="h-3 w-3" /> Not subscribed
          </span>
        )}
      </div>

      {/* Action row */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <Button
          size="sm"
          onClick={() => onPayFull(row)}
          disabled={owedThisMonth <= 0.5}
          className="h-10 font-semibold"
        >
          <IndianRupee className="h-4 w-4 mr-1" />
          Pay Full
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onPayCustom(row)}
          className="h-10"
        >
          <Pencil className="h-4 w-4 mr-1" />
          Custom
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onPayAdjust(row)}
          className="h-10"
        >
          <ArrowRightLeft className="h-4 w-4 mr-1" />
          Adjust
        </Button>
      </div>
    </Card>
  )
}
