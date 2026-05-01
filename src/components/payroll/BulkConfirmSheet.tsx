'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X, Loader2, IndianRupee, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn, formatINR } from '@/lib/utils'
import type { BulkPaymentType } from './EmployeePayrollCard'

export type BulkAccount =
  | 'CASH'
  | 'PRASHANT_GAYDHANE'
  | 'PMR'
  | 'KPG_SAVING'
  | 'KP_ENTERPRISES'

const ACCOUNT_LABELS: Record<BulkAccount, string> = {
  CASH: 'Cash',
  PRASHANT_GAYDHANE: 'Prashant Gaydhane',
  PMR: 'PMR',
  KPG_SAVING: 'KPG Saving',
  KP_ENTERPRISES: 'KP Enterprises',
}

const TYPE_BADGE: Record<BulkPaymentType, string> = {
  REGULAR: 'bg-slate-100 text-slate-700',
  ADVANCE: 'bg-amber-100 text-amber-800',
  ADJUSTMENT: 'bg-violet-100 text-violet-800',
}

export interface BulkConfirmItem {
  employeeId: string
  employeeName: string
  amount: number
  type: BulkPaymentType
}

export interface BulkConfirmResult {
  count: number
  totalPaid: number
  results: {
    employeeId: string
    paymentId: string
    amount: number
    pushStatus: 'sent' | 'no-subscription' | 'expired' | 'error'
  }[]
}

interface Props {
  open: boolean
  month: string
  monthLabel: string
  items: BulkConfirmItem[]
  account: BulkAccount
  onAccountChange: (a: BulkAccount) => void
  onOpenChange: (open: boolean) => void
  onSuccess: (r: BulkConfirmResult) => void
}

export function BulkConfirmSheet({
  open,
  month,
  monthLabel,
  items,
  account,
  onAccountChange,
  onOpenChange,
  onSuccess,
}: Props) {
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')
  const [overallNote, setOverallNote] = React.useState('')
  const [itemNotes, setItemNotes] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (open) {
      setError('')
      setOverallNote('')
      setItemNotes({})
    }
  }, [open])

  const total = items.reduce((s, it) => s + it.amount, 0)

  async function submit() {
    if (items.length === 0 || submitting) return

    const overall = overallNote.trim()
    const builtItems = items.map((i) => {
      const indiv = (itemNotes[i.employeeId] ?? '').trim()
      const notes =
        overall && indiv ? `${overall} — ${indiv}` : overall || indiv || undefined
      return {
        employeeId: i.employeeId,
        employeeName: i.employeeName,
        amount: i.amount,
        type: i.type,
        notes,
      }
    })

    const tooLong = builtItems.find((b) => b.notes && b.notes.length > 500)
    if (tooLong) {
      setError(
        `Note for ${tooLong.employeeName} is too long (max 500 chars after combining the overall note)`
      )
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/employee/salary/pay-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          account,
          items: builtItems.map((b) => ({
            employeeId: b.employeeId,
            amount: b.amount,
            type: b.type,
            notes: b.notes,
          })),
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error || 'Bulk pay failed')
        return
      }
      onSuccess(json.data as BulkConfirmResult)
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
            'inset-x-0 bottom-0 rounded-t-2xl pb-[max(env(safe-area-inset-bottom),1rem)]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
            'duration-200',
            'sm:inset-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:w-full sm:max-w-lg sm:pb-0',
            'sm:data-[state=open]:slide-in-from-bottom-4 sm:data-[state=closed]:slide-out-to-bottom-4 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95'
          )}
        >
          {/* Drag handle */}
          <div className="sm:hidden flex justify-center pt-2 pb-1">
            <div className="h-1.5 w-10 rounded-full bg-slate-300" />
          </div>

          {/* Header */}
          <div className="px-5 pt-3 pb-4 border-b">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <DialogPrimitive.Title className="text-lg font-bold leading-tight">
                  Pay {items.length} employees
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-xs text-muted-foreground mt-0.5">
                  {monthLabel} · review and confirm
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close
                className="rounded-md p-1.5 hover:bg-slate-100 transition-colors"
                aria-label="Close"
                disabled={submitting}
              >
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Account */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Pay all from
              </label>
              <Select value={account} onValueChange={(v) => onAccountChange(v as BulkAccount)}>
                <SelectTrigger className="mt-1.5 h-11" disabled={submitting}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ACCOUNT_LABELS) as BulkAccount[]).map((a) => (
                    <SelectItem key={a} value={a}>
                      {ACCOUNT_LABELS[a]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Overall note */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Overall note (applies to all)
              </label>
              <Textarea
                value={overallNote}
                onChange={(e) => setOverallNote(e.target.value)}
                placeholder="e.g. Diwali bonus batch, October settlements"
                className="mt-1.5 resize-none"
                rows={2}
                maxLength={500}
                disabled={submitting}
              />
            </div>

            {/* Items table */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Breakdown
              </label>
              <div className="mt-1.5 rounded-lg border divide-y">
                {items.map((it) => (
                  <div key={it.employeeId} className="px-3 py-2.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{it.employeeName}</div>
                        <span
                          className={cn(
                            'inline-block mt-0.5 text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded',
                            TYPE_BADGE[it.type]
                          )}
                        >
                          {it.type}
                        </span>
                      </div>
                      <div className="font-semibold tabular-nums shrink-0">
                        {formatINR(it.amount)}
                      </div>
                    </div>
                    <Textarea
                      value={itemNotes[it.employeeId] ?? ''}
                      onChange={(e) =>
                        setItemNotes((prev) => ({ ...prev, [it.employeeId]: e.target.value }))
                      }
                      placeholder={`Note for ${it.employeeName} (optional)`}
                      className="resize-none text-sm"
                      rows={1}
                      maxLength={500}
                      disabled={submitting}
                    />
                  </div>
                ))}
                <div className="px-3 py-2.5 flex items-center justify-between gap-2 bg-slate-50">
                  <div className="text-sm font-semibold">Total</div>
                  <div className="text-base font-bold tabular-nums">{formatINR(total)}</div>
                </div>
              </div>
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
              disabled={submitting || items.length === 0}
              className="h-11 sm:flex-1 font-semibold"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <IndianRupee className="h-4 w-4 mr-2" />
              )}
              Confirm {formatINR(total)}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
