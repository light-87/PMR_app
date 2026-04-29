import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { calculateForMonth } from '@/lib/salary'
import { parseMonthString } from '@/lib/date-utils'
import { sendPush, type PushSubscriptionJSON } from '@/lib/push'

export const dynamic = 'force-dynamic'

const itemSchema = z.object({
  employeeId: z.string().min(1),
  amount: z.number(),
  type: z.enum(['REGULAR', 'ADVANCE', 'ADJUSTMENT']).default('REGULAR'),
  notes: z.string().max(500).optional(),
})

const schema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM'),
  account: z.enum(['CASH', 'PRASHANT_GAYDHANE', 'PMR', 'KPG_SAVING', 'KP_ENTERPRISES']).default('CASH'),
  items: z.array(itemSchema).min(1, 'At least one employee required').max(50),
})

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function formatPeriodHuman(monthString: string): string {
  const [y, m] = monthString.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

type PushStatus = 'sent' | 'no-subscription' | 'expired' | 'error'

// POST /api/employee/salary/pay-bulk
// Atomic batch: validates all items, then creates N ExpenseTransaction + N SalaryPayment rows
// in a single transaction. Pushes are fired per-employee AFTER commit (push errors do not roll back).
// Validation failures (missing employee) abort the whole batch — no partial commit.
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
    const { month, account, items } = parsed.data

    // Reject duplicates — same employee twice in one batch is almost certainly a UI bug.
    const seen = new Set<string>()
    for (const it of items) {
      if (seen.has(it.employeeId)) {
        return NextResponse.json(
          { success: false, error: `Duplicate employee in batch: ${it.employeeId}` },
          { status: 400 }
        )
      }
      seen.add(it.employeeId)
    }

    const employees = await prisma.employee.findMany({
      where: { id: { in: items.map((i) => i.employeeId) } },
      select: { id: true, name: true, monthlySalary: true, active: true, pushSubscription: true },
    })
    const empById = new Map(employees.map((e) => [e.id, e]))
    const missing = items.filter((i) => !empById.has(i.employeeId)).map((i) => i.employeeId)
    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, error: `Employees not found: ${missing.join(', ')}` },
        { status: 404 }
      )
    }

    const { start, end, daysInMonth } = parseMonthString(month)

    // Recompute server-side per employee — never trust client-supplied calculatedAmount.
    const attendanceByEmp = new Map<string, { date: Date; status: 'PRESENT' | 'ABSENT'; approved: boolean }[]>()
    const allAttendance = await prisma.attendanceRecord.findMany({
      where: { employeeId: { in: items.map((i) => i.employeeId) } },
      select: { employeeId: true, date: true, status: true, approved: true },
    })
    for (const a of allAttendance) {
      const arr = attendanceByEmp.get(a.employeeId) ?? []
      arr.push({ date: a.date, status: a.status, approved: a.approved })
      attendanceByEmp.set(a.employeeId, arr)
    }

    // Reject zero / NaN amounts unless ADJUSTMENT (which permits negative + zero).
    for (const it of items) {
      if (Number.isNaN(it.amount)) {
        return NextResponse.json(
          { success: false, error: `Invalid amount for ${empById.get(it.employeeId)?.name ?? it.employeeId}` },
          { status: 400 }
        )
      }
      if (it.type !== 'ADJUSTMENT' && it.amount <= 0) {
        return NextResponse.json(
          { success: false, error: `Amount must be positive for ${empById.get(it.employeeId)?.name ?? it.employeeId}` },
          { status: 400 }
        )
      }
    }

    const txnResult = await prisma.$transaction(async (tx) => {
      const created: { employeeId: string; paymentId: string; expenseId: string; amount: number }[] = []
      for (const it of items) {
        const emp = empById.get(it.employeeId)!
        const calc = calculateForMonth(attendanceByEmp.get(it.employeeId) ?? [], emp.monthlySalary, month)
        const expense = await tx.expenseTransaction.create({
          data: {
            date: new Date(),
            amount: new Prisma.Decimal(it.amount),
            account,
            type: 'EXPENSE',
            name: 'LABOUR PAYMENT',
          },
        })
        const payment = await tx.salaryPayment.create({
          data: {
            employeeId: it.employeeId,
            type: it.type,
            periodStart: start,
            periodEnd: end,
            daysInMonth,
            daysAttended: calc.daysAttended,
            monthlySalary: emp.monthlySalary,
            calculatedAmount: calc.calculatedAmount,
            amountPaid: new Prisma.Decimal(it.amount),
            account,
            expenseId: expense.id,
            notes: it.notes,
          },
        })
        created.push({ employeeId: it.employeeId, paymentId: payment.id, expenseId: expense.id, amount: it.amount })
      }
      return created
    })

    // Push notifications (post-commit, per-employee, in parallel).
    const periodHuman = formatPeriodHuman(month)
    const pushResults = await Promise.all(
      txnResult.map(async (row) => {
        const emp = empById.get(row.employeeId)!
        let pushStatus: PushStatus = 'no-subscription'
        if (emp.pushSubscription && typeof emp.pushSubscription === 'object') {
          const sub = emp.pushSubscription as unknown as PushSubscriptionJSON
          const r = await sendPush(sub, {
            title: 'Salary Credited',
            body: `₹${Number(row.amount).toLocaleString('en-IN')} credited for ${periodHuman}.`,
            url: '/staff/salary',
            tag: `salary-${month}`,
          })
          if (r.ok) {
            pushStatus = 'sent'
          } else if (r.expired) {
            await prisma.employee.update({
              where: { id: row.employeeId },
              data: { pushSubscription: Prisma.JsonNull },
            })
            pushStatus = 'expired'
          } else {
            pushStatus = 'error'
          }
        }
        return { employeeId: row.employeeId, paymentId: row.paymentId, amount: row.amount, pushStatus }
      })
    )

    const totalPaid = txnResult.reduce((s, r) => s + r.amount, 0)
    return NextResponse.json({
      success: true,
      data: {
        count: pushResults.length,
        totalPaid,
        results: pushResults,
      },
    })
  } catch (error) {
    console.error('salary/pay-bulk error', error)
    const message = error instanceof Error ? error.message : 'Failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
