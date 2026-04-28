// IST-safe date helpers.
// All AttendanceRecord.date values are stored as UTC midnight of the IST calendar day.
// Use dateOnlyIST() everywhere — never `new Date()` raw.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

export function dateOnlyIST(d: Date = new Date()): Date {
  const ist = new Date(d.getTime() + IST_OFFSET_MS)
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()))
}

export function startOfMonthIST(d: Date = new Date()): Date {
  const ist = new Date(d.getTime() + IST_OFFSET_MS)
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1))
}

export function endOfMonthIST(d: Date = new Date()): Date {
  const ist = new Date(d.getTime() + IST_OFFSET_MS)
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() + 1, 1))
}

export function daysInMonthIST(yearOrDate: number | Date, monthIndex?: number): number {
  if (yearOrDate instanceof Date) {
    const ist = new Date(yearOrDate.getTime() + IST_OFFSET_MS)
    return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() + 1, 0)).getUTCDate()
  }
  if (typeof monthIndex !== 'number') throw new Error('monthIndex required when passing year')
  return new Date(Date.UTC(yearOrDate, monthIndex + 1, 0)).getUTCDate()
}

export function parseMonthString(month: string): { start: Date; end: Date; daysInMonth: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(month)
  if (!m) throw new Error('Invalid month string: ' + month + ' (expected YYYY-MM)')
  const year = parseInt(m[1], 10)
  const monthIndex = parseInt(m[2], 10) - 1
  const start = new Date(Date.UTC(year, monthIndex, 1))
  const end = new Date(Date.UTC(year, monthIndex + 1, 1))
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
  return { start, end, daysInMonth }
}

export function toMonthStringIST(d: Date): string {
  const ist = new Date(d.getTime() + IST_OFFSET_MS)
  const year = ist.getUTCFullYear()
  const month = (ist.getUTCMonth() + 1).toString().padStart(2, '0')
  return year + '-' + month
}

export function toDateStringIST(d: Date): string {
  const ist = new Date(d.getTime() + IST_OFFSET_MS)
  const year = ist.getUTCFullYear()
  const month = (ist.getUTCMonth() + 1).toString().padStart(2, '0')
  const day = ist.getUTCDate().toString().padStart(2, '0')
  return year + '-' + month + '-' + day
}
