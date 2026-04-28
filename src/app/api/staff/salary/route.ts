import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEmployeeSession } from '@/lib/auth'
import { runningBalance } from '@/lib/salary'
import { toMonthStringIST } from '@/lib/date-utils'

export const dynamic = 'force-dynamic'

// GET /api/staff/salary — running balance + per-month earnings + payment history.
export async function GET() {
  try {
    const session = await verifyEmployeeSession()
    if (!session?.employeeId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const employee = await prisma.employee.findUnique({
      where: { id: session.employeeId },
      select: { id: true, name: true, monthlySalary: true, openingBalance: true, active: true },
    })
    if (!employee || !employee.active) {
      return NextResponse.json({ success: false, error: 'Account not active' }, { status: 403 })
    }

    const [attendance, payments] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: { employeeId: employee.id },
        select: { date: true, status: true, approved: true },
      }),
      prisma.salaryPayment.findMany({
        where: { employeeId: employee.id },
        orderBy: { paidDate: 'desc' },
        select: {
          id: true,
          type: true,
          periodStart: true,
          periodEnd: true,
          daysInMonth: true,
          daysAttended: true,
          monthlySalary: true,
          calculatedAmount: true,
          amountPaid: true,
          paidDate: true,
          notes: true,
        },
      }),
    ])

    const balance = runningBalance(attendance, payments, employee.monthlySalary, employee.openingBalance)

    // Annotate payments with the IST month string of their period for display grouping.
    const paymentsAnnotated = payments.map((p) => ({
      ...p,
      monthString: toMonthStringIST(p.periodStart),
    }))

    return NextResponse.json({
      success: true,
      data: {
        employee: {
          id: employee.id,
          name: employee.name,
          monthlySalary: employee.monthlySalary,
          openingBalance: employee.openingBalance,
        },
        totalEarned: balance.totalEarned,
        totalPaid: balance.totalPaid,
        openingBalance: balance.openingBalance,
        balance: balance.balance,
        byMonth: balance.byMonth,
        payments: paymentsAnnotated,
      },
    })
  } catch (error) {
    console.error('staff salary error', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
