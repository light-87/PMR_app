'use client'

import { IndianRupee, CheckCircle2, Hourglass, CalendarDays } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn, formatINR } from '@/lib/utils'

export type KpiFilter = 'ALL' | 'PENDING' | 'PAID'

interface KpiStripProps {
  payable: number
  paid: number
  pendingCount: number
  totalCount: number
  weekOwed: number
  overdueCount: number
  active: KpiFilter
  onFilter: (f: KpiFilter) => void
}

export function KpiStrip({
  payable,
  paid,
  pendingCount,
  totalCount,
  weekOwed,
  overdueCount,
  active,
  onFilter,
}: KpiStripProps) {
  const paidPct = payable > 0 ? Math.min(100, Math.round((paid / payable) * 100)) : 0

  // Filterable tiles (clickable). The "This week" tile below is informational only.
  const filterTiles: Array<{
    key: KpiFilter
    label: string
    value: string
    sub: string
    accent: string
    accentBar: string
    icon: JSX.Element
  }> = [
    {
      key: 'ALL',
      label: 'Payable',
      value: formatINR(payable),
      sub: 'this month',
      accent: 'text-blue-700',
      accentBar: 'bg-blue-500',
      icon: <IndianRupee className="h-4 w-4 text-blue-600" />,
    },
    {
      key: 'PAID',
      label: 'Paid',
      value: formatINR(paid),
      sub: payable > 0 ? `${paidPct}% done` : '—',
      accent: 'text-emerald-700',
      accentBar: 'bg-emerald-500',
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
    },
    {
      key: 'PENDING',
      label: 'Pending',
      value: `${pendingCount} of ${totalCount}`,
      sub: pendingCount === 0 ? 'all clear' : 'employees',
      accent: 'text-amber-700',
      accentBar: 'bg-amber-500',
      icon: <Hourglass className="h-4 w-4 text-amber-600" />,
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      {filterTiles.map((t) => {
        const isActive = active === t.key
        return (
          <Card
            key={t.key}
            role="button"
            tabIndex={0}
            onClick={() => onFilter(t.key)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onFilter(t.key)
              }
            }}
            className={cn(
              'relative cursor-pointer p-3 sm:p-4 transition-all min-h-[88px] overflow-hidden',
              'hover:shadow-md hover:-translate-y-0.5',
              isActive ? 'ring-2 ring-primary ring-offset-1' : 'ring-1 ring-transparent'
            )}
          >
            <div className={cn('absolute inset-x-0 top-0 h-1', t.accentBar)} />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {t.icon}
              <span className="font-medium">{t.label}</span>
            </div>
            <div className={cn('mt-1.5 text-base sm:text-xl font-bold tabular-nums', t.accent)}>
              {t.value}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{t.sub}</div>
          </Card>
        )
      })}

      {/* Informational: weekly run-rate tile (not a filter). */}
      <Card
        className={cn(
          'relative p-3 sm:p-4 min-h-[88px] overflow-hidden',
          'ring-1 ring-transparent'
        )}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-violet-500" />
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-4 w-4 text-violet-600" />
          <span className="font-medium">Owed this week</span>
        </div>
        <div className="mt-1.5 text-base sm:text-xl font-bold tabular-nums text-violet-700">
          {formatINR(weekOwed)}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
          {overdueCount > 0 ? `${overdueCount} overdue` : 'since last pay'}
        </div>
      </Card>
    </div>
  )
}
