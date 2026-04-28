import { Check, Circle, CircleDashed, ArrowUp } from 'lucide-react'
import { cn, formatINR, type PaymentStatus } from '@/lib/utils'

const STYLES: Record<
  PaymentStatus,
  { container: string; dot: string; label: string; icon: JSX.Element }
> = {
  PAID: {
    container: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
    label: 'PAID',
    icon: <Check className="h-3 w-3" />,
  },
  PARTIAL: {
    container: 'bg-amber-100 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
    label: 'PARTIAL',
    icon: <CircleDashed className="h-3 w-3" />,
  },
  PENDING: {
    container: 'bg-rose-100 text-rose-800 border-rose-200',
    dot: 'bg-rose-500',
    label: 'PENDING',
    icon: <Circle className="h-3 w-3 fill-current" />,
  },
  OVERPAID: {
    container: 'bg-sky-100 text-sky-800 border-sky-200',
    dot: 'bg-sky-500',
    label: 'OVERPAID',
    icon: <ArrowUp className="h-3 w-3" />,
  },
}

export function StatusPill({
  status,
  amount,
  className,
}: {
  status: PaymentStatus
  amount?: number
  className?: string
}) {
  const s = STYLES[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap',
        s.container,
        className
      )}
    >
      {s.icon}
      <span>{s.label}</span>
      {typeof amount === 'number' && amount > 0 && (
        <span className="font-bold tabular-nums">{formatINR(amount)}</span>
      )}
    </span>
  )
}
