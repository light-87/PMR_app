import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-IN')
}

// Indian rupee with symbol — handles negatives like '-₹1,234'.
export function formatINR(amount: number): string {
  const sign = amount < 0 ? '-' : ''
  return `${sign}₹${Math.abs(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export type PaymentStatus = 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERPAID'

// Status of an employee's pay state for the selected month.
// `balance` is the running balance across all months (positive = owed, negative = overpaid).
// `paidThisMonth` is sum of SalaryPayment.amountPaid for the selected month only.
// `calculatedAmount` is what's owed for the selected month based on attendance.
export function paymentStatus(
  balance: number,
  paidThisMonth: number,
  calculatedAmount: number
): PaymentStatus {
  if (balance < -0.5) return 'OVERPAID'
  // For an unattended month (calculatedAmount==0) we treat any paidThisMonth as PAID.
  const owedThisMonth = Math.max(calculatedAmount - paidThisMonth, 0)
  if (owedThisMonth <= 0.5 && paidThisMonth > 0) return 'PAID'
  if (paidThisMonth > 0.5) return 'PARTIAL'
  if (calculatedAmount <= 0.5) return 'PAID' // nothing earned this month → not pending
  return 'PENDING'
}
