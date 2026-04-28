import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AuthRole = 'ADMIN' | 'EXPENSE_INVENTORY' | 'INVENTORY_ONLY' | 'EMPLOYEE'

interface AuthState {
  role: AuthRole | null
  employeeId: string | null
  setRole: (role: AuthRole | null) => void
  setEmployee: (employeeId: string | null) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      role: null,
      employeeId: null,
      setRole: (role) => set({ role }),
      setEmployee: (employeeId) => set({ employeeId }),
      clearAuth: () => set({ role: null, employeeId: null }),
    }),
    {
      name: 'pmr-auth',
    }
  )
)
