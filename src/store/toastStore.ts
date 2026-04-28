import { create } from 'zustand'

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  id: string
  variant: ToastVariant
  title: string
  description?: string
  action?: ToastAction
  durationMs: number
  createdAt: number
}

interface ToastState {
  toasts: Toast[]
  show: (input: Omit<Toast, 'id' | 'createdAt' | 'durationMs'> & { durationMs?: number }) => string
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (input) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const toast: Toast = {
      id,
      variant: input.variant,
      title: input.title,
      description: input.description,
      action: input.action,
      durationMs: input.durationMs ?? 4000,
      createdAt: Date.now(),
    }
    set((s) => ({ toasts: [...s.toasts, toast] }))
    return id
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = {
  success: (title: string, opts?: Partial<Omit<Toast, 'id' | 'createdAt' | 'variant' | 'title'>>) =>
    useToastStore.getState().show({ variant: 'success', title, ...opts }),
  error: (title: string, opts?: Partial<Omit<Toast, 'id' | 'createdAt' | 'variant' | 'title'>>) =>
    useToastStore.getState().show({ variant: 'error', title, durationMs: 6000, ...opts }),
  info: (title: string, opts?: Partial<Omit<Toast, 'id' | 'createdAt' | 'variant' | 'title'>>) =>
    useToastStore.getState().show({ variant: 'info', title, ...opts }),
}
