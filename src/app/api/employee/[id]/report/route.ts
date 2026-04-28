import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { runningBalance } from '@/lib/salary'
import { toMonthStringIST } from '@/lib/date-utils'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/employee/[id]/report — full report payload for client-side PDF generation.
// Includes everything: employee meta, full attendance, full payments, by-month earnings,
// and computed running balance. The UI then renders a PDF locally with jspdf.
export async function GET(_request: NextRequest, context: Ctx) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await context.params

    const employee = await prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        monthlySalary: true,
        openingBalance: true,
        joinedDate: true,
        active: true,
      },
    })
    if (!employee) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    const [attendance, payments] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: { employeeId: id },
        orderBy: { date: 'desc' },
        select: {
          id: true,
          date: true,
          markedAt: true,
          status: true,
          source: true,
          approved: true,
          modified: true,
          modifiedAt: true,
          notes: true,
        },
      }),
      prisma.salaryPayment.findMany({
        where: { employeeId: id },
        orderBy: { paidDate: 'desc' },
      }),
    ])

    const balance = runningBalance(attendance, payments, employee.monthlySalary, employee.openingBalance)

    const paymentsAnnotated = payments.map((p) => ({
      ...p,
      monthString: toMonthStringIST(p.periodStart),
    }))

    return NextResponse.json({
      success: true,
      data: {
        employee,
        summary: {
          openingBalance: balance.openingBalance,
          totalEarned: balance.totalEarned,
          totalPaid: balance.totalPaid,
          balance: balance.balance,
          byMonth: balance.byMonth,
        },
        attendance,
        payments: paymentsAnnotated,
        generatedAt: new Date(),
      },
    })
  } catch (error) {
    console.error('employee report error', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
