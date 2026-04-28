import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { runningBalance } from '@/lib/salary'
import { toMonthStringIST } from '@/lib/date-utils'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/employee/[id]/payments — admin: payment list + running balance summary.
export async function GET(_request: NextRequest, context: Ctx) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await context.params

    const employee = await prisma.employee.findUnique({
      where: { id },
      select: { id: true, monthlySalary: true },
    })
    if (!employee) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    const [attendance, payments] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: { employeeId: id },
        select: { date: true, status: true, approved: true },
      }),
      prisma.salaryPayment.findMany({
        where: { employeeId: id },
        orderBy: { paidDate: 'desc' },
      }),
    ])

    const balance = runningBalance(attendance, payments, employee.monthlySalary)

    const paymentsAnnotated = payments.map((p) => ({
      ...p,
      monthString: toMonthStringIST(p.periodStart),
    }))

    return NextResponse.json({
      success: true,
      data: {
        totalEarned: balance.totalEarned,
        totalPaid: balance.totalPaid,
        balance: balance.balance,
        byMonth: balance.byMonth,
        payments: paymentsAnnotated,
      },
    })
  } catch (error) {
    console.error('admin payments GET error', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
