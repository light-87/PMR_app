'use client'

import { Button } from '@/components/ui/button'
import { IndianRupee, X } from 'lucide-react'
import { formatINR } from '@/lib/utils'

interface Props {
  count: number
  total: number
  invalidCount: number
  onClear: () => void
  onReview: () => void
}

// Sticky bottom action bar shown while bulk-select mode is active and at least one row is selected.
// `invalidCount` is the number of selections with a non-positive / NaN amount and a non-ADJUSTMENT type;
// when > 0 the primary CTA disables and a hint replaces the total.
export function BulkPayBar({ count, total, invalidCount, onClear, onReview }: Props) {
  const blocked = invalidCount > 0
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background shadow-[0_-4px_12px_-2px_rgba(0,0,0,0.08)] pb-[max(env(safe-area-inset-bottom),0.5rem)]"
      role="region"
      aria-label="Bulk pay action bar"
    >
      <div className="mx-auto max-w-2xl flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 rounded-md p-2 hover:bg-slate-100 transition-colors"
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">
            {count} selected
          </div>
          <div className="text-base font-bold tabular-nums truncate">
            {blocked ? (
              <span className="text-amber-700">
                {invalidCount} need{invalidCount === 1 ? 's' : ''} an amount
              </span>
            ) : (
              <>Total {formatINR(total)}</>
            )}
          </div>
        </div>
        <Button
          onClick={onReview}
          disabled={blocked || count === 0}
          className="h-11 px-5 font-semibold shrink-0"
        >
          <IndianRupee className="h-4 w-4 mr-1" />
          Pay all
        </Button>
      </div>
    </div>
  )
}
