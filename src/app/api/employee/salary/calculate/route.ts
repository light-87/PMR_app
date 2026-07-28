import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { calculateForMonth, earningsByMonth, runningBalance } from '@/lib/salary'
import { dateOnlyIST, parseMonthString, toMonthStringIST } from '@/lib/date-utils'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET /api/employee/salary/calculate?employeeId=X&month=YYYY-MM
// Returns suggested calc for the given month plus the employee's current running balance.
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const employeeId = request.nextUrl.searchParams.get('employeeId')
    const month = request.nextUrl.searchParams.get('month') ?? toMonthStringIST(new Date())
    if (!employeeId) {
      return NextResponse.json({ success: false, error: 'employeeId required' }, { status: 400 })
    }
    try {
      parseMonthString(month)
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid month' }, { status: 400 })
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true, monthlySalary: true, openingBalance: true, joinedDate: true, active: true },
    })
    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })
    }

    const { start, end } = parseMonthString(month)

    const [attendance, payments, monthPayments, lastPayment, lastEarningPayment] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: { employeeId },
        select: { date: true, status: true, approved: true },
      }),
      prisma.salaryPayment.findMany({
        where: { employeeId },
        select: { amountPaid: true, type: true },
      }),
      // Drives "already paid this month", which the pay sheet subtracts from the suggested
      // amount. Bonuses are on top of salary, so they must not reduce what is still owed.
      prisma.salaryPayment.findMany({
        where: { employeeId, periodStart: { gte: start, lt: end }, type: { not: 'BONUS' } },
        select: { amountPaid: true },
      }),
      prisma.salaryPayment.findFirst({
        where: { employeeId },
        orderBy: { paidDate: 'desc' },
        select: { amountPaid: true, type: true, paidDate: true },
      }),
      // Anchor for "since last paid" earnings — REGULAR or ADJUSTMENT only.
      // ADVANCE doesn't reset the work-done clock; it's money up front.
      prisma.salaryPayment.findFirst({
        where: { employeeId, type: { in: ['REGULAR', 'ADJUSTMENT'] } },
        orderBy: { paidDate: 'desc' },
        select: { paidDate: true },
      }),
    ])

    const calc = calculateForMonth(attendance, employee.monthlySalary, month)
    const balance = runningBalance(attendance, payments, employee.monthlySalary, employee.openingBalance)
    const paidThisMonth = monthPayments.reduce(
      (acc, p) => acc.add(new Prisma.Decimal(p.amountPaid as Prisma.Decimal.Value)),
      new Prisma.Decimal(0)
    )

    // "Since last paid" — earnings + days worked between the anchor (exclusive) and today (inclusive).
    // Anchor = last REGULAR/ADJUSTMENT payment date, or joinedDate for new employees.
    // Earnings sum across months so it stays correct across month boundaries.
    const anchorDate = lastEarningPayment?.paidDate ?? employee.joinedDate
    const anchorDayIST = dateOnlyIST(anchorDate)
    const todayIST = dateOnlyIST(new Date())
    const sinceAttendance = attendance.filter((r) => {
      const d = dateOnlyIST(r.date)
      return d > anchorDayIST && d <= todayIST
    })
    const sinceEarnings = earningsByMonth(sinceAttendance, employee.monthlySalary)
    const sinceEarned = sinceEarnings.reduce(
      (acc, m) => acc.add(m.earned),
      new Prisma.Decimal(0)
    )
    const daysWorkedSince = sinceAttendance.reduce(
      (n, r) => n + (r.approved && r.status === 'PRESENT' ? 1 : 0),
      0
    )
    const daysSinceAnchor = Math.max(
      0,
      Math.round((todayIST.getTime() - anchorDayIST.getTime()) / 86400000)
    )

    return NextResponse.json({
      success: true,
      data: {
        employee: { id: employee.id, name: employee.name, monthlySalary: employee.monthlySalary },
        month,
        ...calc,
        runningBalance: balance.balance,
        totalEarned: balance.totalEarned,
        totalPaid: balance.totalPaid,
        paidThisMonth,
        lastPayment,
        sincePaid: {
          anchorDate: anchorDayIST.toISOString(),
          anchorIsJoined: !lastEarningPayment,
          daysSinceAnchor,
          daysWorked: daysWorkedSince,
          earned: sinceEarned,
        },
      },
    })
  } catch (error) {
    console.error('salary/calculate error', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
