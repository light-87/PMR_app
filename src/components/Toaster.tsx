'use client'

import { useEffect } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { useToastStore, type Toast } from '@/store/toastStore'
import { cn } from '@/lib/utils'

const VARIANT_STYLES: Record<Toast['variant'], { container: string; icon: JSX.Element }> = {
  success: {
    container: 'bg-emerald-600 text-white border-emerald-700',
    icon: <CheckCircle2 className="h-5 w-5 shrink-0" />,
  },
  error: {
    container: 'bg-rose-600 text-white border-rose-700',
    icon: <XCircle className="h-5 w-5 shrink-0" />,
  },
  info: {
    container: 'bg-slate-800 text-white border-slate-900',
    icon: <Info className="h-5 w-5 shrink-0" />,
  },
}

function ToastRow({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss)

  useEffect(() => {
    const t = setTimeout(() => dismiss(toast.id), toast.durationMs)
    return () => clearTimeout(t)
  }, [toast.id, toast.durationMs, dismiss])

  const v = VARIANT_STYLES[toast.variant]

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg',
        'animate-in slide-in-from-bottom-4 fade-in duration-200',
        'min-w-[280px] max-w-[420px]',
        v.container
      )}
    >
      {v.icon}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm leading-tight">{toast.title}</div>
        {toast.description && (
          <div className="text-xs opacity-90 mt-0.5 leading-snug">{toast.description}</div>
        )}
      </div>
      {toast.action && (
        <button
          onClick={() => {
            toast.action!.onClick()
            dismiss(toast.id)
          }}
          className="text-xs font-semibold underline-offset-2 hover:underline shrink-0 px-1 py-0.5"
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss"
        className="opacity-70 hover:opacity-100 shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[100] pointer-events-none flex flex-col items-center sm:items-end gap-2 p-4 sm:bottom-4 sm:right-4 sm:left-auto"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastRow key={t.id} toast={t} />
      ))}
    </div>
  )
}
