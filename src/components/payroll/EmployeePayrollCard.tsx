'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { IndianRupee, Pencil, ArrowRightLeft, Bell, BellOff, Phone, Check, AlarmClock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusPill } from './StatusPill'
import { cn, formatINR, type PaymentStatus } from '@/lib/utils'

export type BulkPaymentType = 'REGULAR' | 'ADVANCE' | 'ADJUSTMENT'

export interface SincePaidInfo {
  anchorDate: string
  anchorIsJoined: boolean
  daysSinceAnchor: number
  daysWorked: number
  earned: number
}

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
  sincePaid: SincePaidInfo | null
  pushStatus?: 'sent' | 'no-subscription' | 'expired' | 'error' | null
  flashGreen?: boolean
}

interface Props {
  row: EmployeePayrollRow
  onPayFull: (row: EmployeePayrollRow) => void
  onPayCustom: (row: EmployeePayrollRow) => void
  onPayAdjust: (row: EmployeePayrollRow) => void
  // Bulk-select mode (optional). When `selectMode` is true, the action row is replaced with
  // a checkbox + per-row amount editor; otherwise the card behaves as before.
  selectMode?: boolean
  selected?: boolean
  selectedAmount?: string
  selectedType?: BulkPaymentType
  onToggleSelect?: (row: EmployeePayrollRow) => void
  onAmountChange?: (employeeId: string, amount: string) => void
  onTypeChange?: (employeeId: string, type: BulkPaymentType) => void
}

const BULK_TYPES: { value: BulkPaymentType; label: string }[] = [
  { value: 'REGULAR', label: 'Regular' },
  { value: 'ADVANCE', label: 'Advance' },
  { value: 'ADJUSTMENT', label: 'Adjust' },
]

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

export function EmployeePayrollCard({
  row,
  onPayFull,
  onPayCustom,
  onPayAdjust,
  selectMode = false,
  selected = false,
  selectedAmount = '',
  selectedType = 'REGULAR',
  onToggleSelect,
  onAmountChange,
  onTypeChange,
}: Props) {
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

  const handleCardClick = () => {
    if (selectMode && onToggleSelect) onToggleSelect(row)
  }

  return (
    <Card
      onClick={handleCardClick}
      className={cn(
        'p-4 space-y-3 transition-colors duration-700',
        flashing && 'bg-emerald-50 ring-2 ring-emerald-400',
        selectMode && 'cursor-pointer',
        selectMode && selected && 'ring-2 ring-primary bg-primary/5'
      )}
    >
      {/* Top row: name + status pill */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex items-start gap-2.5">
          {selectMode && (
            <span
              className={cn(
                'mt-1 h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-colors',
                selected
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'bg-background border-slate-300'
              )}
              aria-hidden
            >
              {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            </span>
          )}
          <div className="min-w-0">
          <Link
            href={`/employee/${row.id}`}
            onClick={(e) => selectMode && e.preventDefault()}
            className={cn(
              'font-semibold text-base block truncate',
              !selectMode && 'hover:underline'
            )}
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

      {/* Running balance — across all months */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Balance</span>
        <span
          className={cn(
            'tabular-nums font-semibold',
            row.runningBalance > 0.5 && 'text-amber-700',
            row.runningBalance < -0.5 && 'text-emerald-700',
            Math.abs(row.runningBalance) <= 0.5 && 'text-muted-foreground'
          )}
        >
          {formatINR(row.runningBalance)}
          {row.runningBalance < -0.5 && (
            <span className="ml-1.5 text-[10px] uppercase tracking-wide opacity-80">advance</span>
          )}
          {row.runningBalance > 0.5 && (
            <span className="ml-1.5 text-[10px] uppercase tracking-wide opacity-80">pending</span>
          )}
        </span>
      </div>

      {/* Last paid + push + unpaid-days */}
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
        {row.sincePaid && row.sincePaid.daysSinceAnchor > 0 && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded px-1.5 py-0.5 border tabular-nums',
              row.sincePaid.daysSinceAnchor > 7
                ? 'text-amber-800 bg-amber-50 border-amber-200'
                : 'text-slate-700 bg-slate-50 border-slate-200'
            )}
            title={
              row.sincePaid.anchorIsJoined
                ? `Since joined: ${row.sincePaid.daysWorked} days worked`
                : `Since last pay: ${row.sincePaid.daysWorked} days worked`
            }
          >
            <AlarmClock className="h-3 w-3" />
            {row.sincePaid.daysSinceAnchor}d {row.sincePaid.anchorIsJoined ? 'on payroll' : 'unpaid'}
            {row.sincePaid.earned > 0.5 && (
              <>
                <span className="opacity-50 mx-0.5">·</span>
                {formatINR(row.sincePaid.earned)} earned
              </>
            )}
          </span>
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

      {selectMode ? (
        selected ? (
          <div
            className="space-y-2 pt-1 border-t -mx-1 px-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Amount to pay
              </label>
              <div className="relative mt-1">
                <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={selectedAmount}
                  onChange={(e) => onAmountChange?.(row.id, e.target.value)}
                  inputMode="decimal"
                  className="pl-8 h-10 font-semibold tabular-nums"
                  placeholder="0"
                />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {row.sincePaid && row.sincePaid.earned > 0.5 && (
                  <button
                    type="button"
                    onClick={() => onAmountChange?.(row.id, row.sincePaid!.earned.toFixed(2))}
                    className="text-[10px] px-2 py-1 rounded-md bg-violet-100 hover:bg-violet-200 text-violet-800 font-semibold transition-colors"
                  >
                    Since pay {formatINR(row.sincePaid.earned)}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onAmountChange?.(row.id, owedThisMonth.toFixed(2))}
                  className="text-[10px] px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                  disabled={owedThisMonth <= 0}
                >
                  Owed {formatINR(owedThisMonth)}
                </button>
                <button
                  type="button"
                  onClick={() => onAmountChange?.(row.id, row.calculatedAmount.toFixed(2))}
                  className="text-[10px] px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Earned {formatINR(row.calculatedAmount)}
                </button>
                <button
                  type="button"
                  onClick={() => onAmountChange?.(row.id, '0')}
                  className="text-[10px] px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-md bg-slate-100">
              {BULK_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => onTypeChange?.(row.id, t.value)}
                  className={cn(
                    'flex-1 px-2 py-1.5 rounded text-[11px] font-semibold transition-all',
                    selectedType === t.value
                      ? 'bg-white shadow-sm text-primary'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground italic pt-1">
            Tap to add to batch
          </div>
        )
      ) : (
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
      )}
    </Card>
  )
}
