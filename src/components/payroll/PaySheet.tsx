'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X, Loader2, IndianRupee, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn, formatINR } from '@/lib/utils'

export type PaymentType = 'REGULAR' | 'ADVANCE' | 'ADJUSTMENT' | 'BONUS'
export type Account =
  | 'CASH'
  | 'PRASHANT_GAYDHANE'
  | 'PMR'
  | 'KPG_SAVING'
  | 'KP_ENTERPRISES'

const ACCOUNT_LABELS: Record<Account, string> = {
  CASH: 'Cash',
  PRASHANT_GAYDHANE: 'Prashant Gaydhane',
  PMR: 'PMR',
  KPG_SAVING: 'KPG Saving',
  KP_ENTERPRISES: 'KP Enterprises',
}

export interface PaySheetContext {
  employeeId: string
  employeeName: string
  month: string
  monthLabel: string
  initialAmount: number
  calculatedAmount: number
  paidThisMonth: number
  initialType: PaymentType
}

export interface PaySuccessResult {
  amountPaid: number
  type: PaymentType
  account: Account
  pushStatus: 'sent' | 'no-subscription' | 'expired' | 'error'
}

interface Props {
  open: boolean
  ctx: PaySheetContext | null
  onOpenChange: (open: boolean) => void
  onSuccess: (result: PaySuccessResult) => void
}

const TYPES: { value: PaymentType; label: string; helper: string }[] = [
  { value: 'REGULAR', label: 'Regular', helper: 'Monthly salary' },
  { value: 'ADVANCE', label: 'Advance', helper: 'Money up front' },
  { value: 'ADJUSTMENT', label: 'Adjust', helper: 'Correction · ± allowed' },
  { value: 'BONUS', label: 'Bonus', helper: 'Extra · on top' },
]

export function PaySheet({ open, ctx, onOpenChange, onSuccess }: Props) {
  const [amount, setAmount] = React.useState('0')
  const [type, setType] = React.useState<PaymentType>('REGULAR')
  const [account, setAccount] = React.useState<Account>('CASH')
  const [notes, setNotes] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (open && ctx) {
      setAmount(ctx.initialAmount.toFixed(2))
      setType(ctx.initialType)
      setAccount('CASH')
      setNotes('')
      setError('')
    }
  }, [open, ctx])

  if (!ctx) return null

  const numericAmount = parseFloat(amount)
  const owedThisMonth = Math.max(ctx.calculatedAmount - ctx.paidThisMonth, 0)
  const amountIsValid = !Number.isNaN(numericAmount) && (type === 'ADJUSTMENT' || numericAmount > 0)

  async function submit() {
    if (!amountIsValid || !ctx) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/employee/salary/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: ctx.employeeId,
          month: ctx.month,
          amountPaid: numericAmount,
          type,
          account,
          notes: notes.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error || 'Payment failed')
        return
      }
      onSuccess({
        amountPaid: numericAmount,
        type,
        account,
        pushStatus: json.data.pushStatus,
      })
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error — try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/60',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0'
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed z-50 bg-background shadow-2xl',
            // mobile: bottom sheet
            'inset-x-0 bottom-0 rounded-t-2xl pb-[max(env(safe-area-inset-bottom),1rem)]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
            'duration-200',
            // desktop: centered modal
            'sm:inset-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:w-full sm:max-w-md sm:pb-0',
            'sm:data-[state=open]:slide-in-from-bottom-4 sm:data-[state=closed]:slide-out-to-bottom-4 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95'
          )}
        >
          {/* Drag handle (mobile only) */}
          <div className="sm:hidden flex justify-center pt-2 pb-1">
            <div className="h-1.5 w-10 rounded-full bg-slate-300" />
          </div>

          {/* Header */}
          <div className="px-5 pt-3 pb-4 border-b">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <DialogPrimitive.Title className="text-lg font-bold leading-tight truncate">
                  Pay {ctx.employeeName}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-xs text-muted-foreground mt-0.5">
                  {ctx.monthLabel} · suggested {formatINR(owedThisMonth)}
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close
                className="rounded-md p-1.5 hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Amount */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Amount
              </label>
              <div className="relative mt-1.5">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  autoFocus
                  className="pl-9 text-2xl font-bold h-14 tabular-nums"
                  placeholder="0"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && amountIsValid && !submitting) {
                      void submit()
                    }
                  }}
                />
              </div>
              {/* Hidden for BONUS — these shortcuts fill in salary figures, which would be
                  the wrong number to hand over as a bonus. */}
              <div className={cn('flex flex-wrap gap-1.5 mt-2', type === 'BONUS' && 'hidden')}>
                <button
                  type="button"
                  onClick={() => setAmount(owedThisMonth.toFixed(2))}
                  className="text-xs px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 transition-colors"
                  disabled={owedThisMonth <= 0}
                >
                  Pay full ({formatINR(owedThisMonth)})
                </button>
                <button
                  type="button"
                  onClick={() => setAmount((owedThisMonth / 2).toFixed(2))}
                  className="text-xs px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 transition-colors"
                  disabled={owedThisMonth <= 0}
                >
                  Half
                </button>
                <button
                  type="button"
                  onClick={() => setAmount(ctx.calculatedAmount.toFixed(2))}
                  className="text-xs px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Earned ({formatINR(ctx.calculatedAmount)})
                </button>
              </div>
            </div>

            {/* Type — segmented control */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Type
              </label>
              {/* 2×2 rather than a 4-wide row: at 360px four cells cannot fit the helper
                  text, and the modal caps at max-w-md so a 2-col grid reads well there too. */}
              <div className="grid grid-cols-2 gap-1.5 mt-1.5 p-1 rounded-lg bg-slate-100">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={cn(
                      'px-2 py-2 rounded-md text-xs font-semibold transition-all',
                      type === t.value
                        ? 'bg-white shadow text-primary'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    <div>{t.label}</div>
                    <div className="text-[10px] font-normal opacity-75 mt-0.5">{t.helper}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Account */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Pay from account
              </label>
              <Select value={account} onValueChange={(v) => setAccount(v as Account)}>
                <SelectTrigger className="mt-1.5 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ACCOUNT_LABELS) as Account[]).map((a) => (
                    <SelectItem key={a} value={a}>
                      {ACCOUNT_LABELS[a]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Note (optional)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. festival advance, final settlement"
                className="mt-1.5 resize-none"
                rows={2}
                maxLength={500}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md bg-rose-50 border border-rose-200 p-3 text-sm text-rose-800">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 pt-3 pb-4 border-t flex flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="h-11 sm:flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={!amountIsValid || submitting}
              className="h-11 sm:flex-1 font-semibold"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <IndianRupee className="h-4 w-4 mr-2" />
              )}
              Confirm{' '}
              {amountIsValid && !Number.isNaN(numericAmount) && formatINR(numericAmount)}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
