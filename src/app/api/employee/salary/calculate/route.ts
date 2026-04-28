import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { calculateForMonth, runningBalance } from '@/lib/salary'
import { parseMonthString, toMonthStringIST } from '@/lib/date-utils'
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
      select: { id: true, name: true, monthlySalary: true, openingBalance: true, active: true },
    })
    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })
    }

    const { start, end } = parseMonthString(month)

    const [attendance, payments, monthPayments, lastPayment] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: { employeeId },
        select: { date: true, status: true, approved: true },
      }),
      prisma.salaryPayment.findMany({
        where: { employeeId },
        select: { amountPaid: true },
      }),
      prisma.salaryPayment.findMany({
        where: { employeeId, periodStart: { gte: start, lt: end } },
        select: { amountPaid: true },
      }),
      prisma.salaryPayment.findFirst({
        where: { employeeId },
        orderBy: { paidDate: 'desc' },
        select: { amountPaid: true, type: true, paidDate: true },
      }),
    ])

    const calc = calculateForMonth(attendance, employee.monthlySalary, month)
    const balance = runningBalance(attendance, payments, employee.monthlySalary, employee.openingBalance)
    const paidThisMonth = monthPayments.reduce(
      (acc, p) => acc.add(new Prisma.Decimal(p.amountPaid as Prisma.Decimal.Value)),
      new Prisma.Decimal(0)
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
      },
    })
  } catch (error) {
    console.error('salary/calculate error', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
