import { Prisma } from '@prisma/client'
import type { AttendanceRecord, SalaryPayment } from '@prisma/client'
import { daysInMonthIST, parseMonthString, toMonthStringIST } from './date-utils'

const { Decimal } = Prisma
type DecimalT = InstanceType<typeof Decimal>

// Pure: per-month salary calc.
export function calculateSalary(
  monthlySalary: DecimalT | string | number,
  daysInMonth: number,
  daysAttended: number
): DecimalT {
  if (daysInMonth <= 0) return new Decimal(0)
  return new Decimal(monthlySalary as Prisma.Decimal.Value).mul(daysAttended).div(daysInMonth)
}

export type MonthlyEarnings = {
  month: string // "YYYY-MM"
  daysInMonth: number
  daysAttended: number
  earned: DecimalT
}

// Sum approved-PRESENT records grouped by month, return earnings per month.
// `monthlySalary` is the live current value — per design we don't snapshot per month
// for the running balance.
export function earningsByMonth(
  attendance: Pick<AttendanceRecord, 'date' | 'status' | 'approved'>[],
  monthlySalary: DecimalT | string | number
): MonthlyEarnings[] {
  const presentByMonth = new Map<string, number>()
  for (const r of attendance) {
    if (!r.approved || r.status !== 'PRESENT') continue
    const month = toMonthStringIST(r.date)
    presentByMonth.set(month, (presentByMonth.get(month) ?? 0) + 1)
  }

  const result: MonthlyEarnings[] = []
  for (const [month, daysAttended] of presentByMonth) {
    const { daysInMonth } = parseMonthString(month)
    result.push({
      month,
      daysInMonth,
      daysAttended,
      earned: calculateSalary(monthlySalary, daysInMonth, daysAttended),
    })
  }
  result.sort((a, b) => a.month.localeCompare(b.month))
  return result
}

export type RunningBalance = {
  totalEarned: DecimalT
  totalPaid: DecimalT
  totalBonus: DecimalT
  openingBalance: DecimalT
  balance: DecimalT // positive = pending owed to employee, negative = overpaid
  byMonth: MonthlyEarnings[]
}

// BONUS is money given on top of earned salary, so it must never settle a due. Counting
// it as `paid` would push the balance negative and make the employee look overpaid on
// salary they are still owed. Every balance calculation filters through this.
export function isSalarySettlingPayment(type: SalaryPayment['type']): boolean {
  return type !== 'BONUS'
}

// `openingBalance` is the migration carry-over (positive = owed to employee at time of
// onboarding, negative = advance already given). Defaults to 0 for new employees.
export function runningBalance(
  attendance: Pick<AttendanceRecord, 'date' | 'status' | 'approved'>[],
  payments: Pick<SalaryPayment, 'amountPaid' | 'type'>[],
  monthlySalary: DecimalT | string | number,
  openingBalance: DecimalT | string | number = 0
): RunningBalance {
  const opening = new Decimal(openingBalance as Prisma.Decimal.Value)
  const byMonth = earningsByMonth(attendance, monthlySalary)
  const totalEarned = byMonth.reduce((acc, m) => acc.add(m.earned), new Decimal(0))

  let totalPaid = new Decimal(0)
  let totalBonus = new Decimal(0)
  for (const p of payments) {
    const amount = new Decimal(p.amountPaid as Prisma.Decimal.Value)
    if (isSalarySettlingPayment(p.type)) {
      totalPaid = totalPaid.add(amount)
    } else {
      totalBonus = totalBonus.add(amount)
    }
  }

  return {
    totalEarned,
    totalPaid,
    totalBonus,
    openingBalance: opening,
    balance: opening.add(totalEarned).sub(totalPaid),
    byMonth,
  }
}

// Suggested calc for a single target month — used by /api/employee/salary/calculate.
export function calculateForMonth(
  attendance: Pick<AttendanceRecord, 'date' | 'status' | 'approved'>[],
  monthlySalary: DecimalT | string | number,
  monthString: string
): { daysInMonth: number; daysAttended: number; calculatedAmount: DecimalT } {
  const { daysInMonth } = parseMonthString(monthString)
  let daysAttended = 0
  for (const r of attendance) {
    if (!r.approved || r.status !== 'PRESENT') continue
    if (toMonthStringIST(r.date) !== monthString) continue
    daysAttended++
  }
  return {
    daysInMonth,
    daysAttended,
    calculatedAmount: calculateSalary(monthlySalary, daysInMonth, daysAttended),
  }
}

// Helper for callers that only have a Date and need (year, monthIndex, daysInMonth).
export function monthInfo(date: Date): { year: number; monthIndex: number; daysInMonth: number } {
  const monthString = toMonthStringIST(date)
  const { daysInMonth } = parseMonthString(monthString)
  const [year, m] = monthString.split('-').map(Number)
  return { year, monthIndex: m - 1, daysInMonth }
}
