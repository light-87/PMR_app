import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { calculateForMonth } from '@/lib/salary'
import { parseMonthString } from '@/lib/date-utils'
import { sendPush, type PushSubscriptionJSON } from '@/lib/push'

export const dynamic = 'force-dynamic'

const schema = z.object({
  employeeId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM'),
  amountPaid: z.number(), // can be negative for adjustments
  type: z.enum(['REGULAR', 'ADVANCE', 'ADJUSTMENT', 'BONUS']).default('REGULAR'),
  account: z.enum(['CASH', 'PRASHANT_GAYDHANE', 'PMR', 'KPG_SAVING', 'KP_ENTERPRISES']).default('CASH'),
  notes: z.string().max(500).optional(),
})

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function formatPeriodHuman(monthString: string): string {
  const [y, m] = monthString.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

// POST /api/employee/salary/pay — atomic: recompute, create ExpenseTransaction + SalaryPayment.
// Then fire web push to employee. If push fails with 404/410, null out their pushSubscription.
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }
    const { employeeId, month, amountPaid, type, account, notes } = parsed.data

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true, monthlySalary: true, active: true, pushSubscription: true },
    })
    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })
    }

    const { start, end, daysInMonth } = parseMonthString(month)

    // Recompute server-side — never trust the client for the suggested amount.
    const attendance = await prisma.attendanceRecord.findMany({
      where: { employeeId },
      select: { date: true, status: true, approved: true },
    })
    const calc = calculateForMonth(attendance, employee.monthlySalary, month)

    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.expenseTransaction.create({
        data: {
          date: new Date(),
          amount: new Prisma.Decimal(amountPaid),
          account,
          type: 'EXPENSE',
          // Bonuses share the LABOUR PAYMENT label so expense reports that group on this
          // name stay whole. The bonus/salary split lives on the SalaryPayment row.
          name: 'LABOUR PAYMENT',
        },
      })

      const payment = await tx.salaryPayment.create({
        data: {
          employeeId,
          type,
          periodStart: start,
          periodEnd: end,
          daysInMonth,
          daysAttended: calc.daysAttended,
          monthlySalary: employee.monthlySalary,
          calculatedAmount: calc.calculatedAmount,
          amountPaid: new Prisma.Decimal(amountPaid),
          account,
          expenseId: expense.id,
          notes,
        },
      })

      return { payment, expense }
    })

    // Fire push (outside the txn — push failure must not roll back the payment).
    let pushStatus: 'sent' | 'no-subscription' | 'expired' | 'error' = 'no-subscription'
    if (employee.pushSubscription && typeof employee.pushSubscription === 'object') {
      const sub = employee.pushSubscription as unknown as PushSubscriptionJSON
      const periodHuman = formatPeriodHuman(month)
      const isBonus = type === 'BONUS'
      const r = await sendPush(sub, {
        title: isBonus ? 'Bonus Credited' : 'Salary Credited',
        body: isBonus
          ? `₹${Number(amountPaid).toLocaleString('en-IN')} bonus credited for ${periodHuman}.`
          : `₹${Number(amountPaid).toLocaleString('en-IN')} credited for ${periodHuman}.`,
        url: '/staff/salary',
        // Distinct tag so a bonus push never replaces the salary push for the same month.
        tag: isBonus ? `bonus-${month}` : `salary-${month}`,
      })
      if (r.ok) {
        pushStatus = 'sent'
      } else if (r.expired) {
        await prisma.employee.update({
          where: { id: employeeId },
          data: { pushSubscription: Prisma.JsonNull },
        })
        pushStatus = 'expired'
      } else {
        pushStatus = 'error'
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        payment: result.payment,
        expense: { id: result.expense.id, name: result.expense.name, amount: result.expense.amount },
        pushStatus,
      },
    })
  } catch (error) {
    console.error('salary/pay error', error)
    const message = error instanceof Error ? error.message : 'Failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
