import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

// POST /api/employee/salary/[id]/reverse — atomic reversal:
//   1. Delete the SalaryPayment row.
//   2. Delete the linked ExpenseTransaction row (if any).
// The employee's running balance auto-recovers because total paid drops by amountPaid.
// Push intentionally not sent — admin reversal is silent (employee can see history change).
export async function POST(_request: NextRequest, context: Ctx) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await context.params

    const payment = await prisma.salaryPayment.findUnique({
      where: { id },
      select: { id: true, expenseId: true, employeeId: true, amountPaid: true },
    })
    if (!payment) {
      return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.salaryPayment.delete({ where: { id: payment.id } })
      if (payment.expenseId) {
        // Defensive: only delete if the expense still exists. Tolerates manual cleanup.
        const exists = await tx.expenseTransaction.findUnique({
          where: { id: payment.expenseId },
          select: { id: true },
        })
        if (exists) {
          await tx.expenseTransaction.delete({ where: { id: payment.expenseId } })
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: { reversedPaymentId: payment.id, employeeId: payment.employeeId },
    })
  } catch (error) {
    console.error('salary/reverse error', error)
    const message = error instanceof Error ? error.message : 'Failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
