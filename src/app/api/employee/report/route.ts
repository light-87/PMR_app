import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { runningBalance } from '@/lib/salary'
import { toMonthStringIST, parseMonthString } from '@/lib/date-utils'

export const dynamic = 'force-dynamic'

const { Decimal } = Prisma

// GET /api/employee/report?month=YYYY-MM — overall report payload.
// Returns one summary row per active employee + 12-month labour cost trend.
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const month = request.nextUrl.searchParams.get('month') ?? toMonthStringIST(new Date())
    let monthInfo
    try {
      monthInfo = parseMonthString(month)
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid month' }, { status: 400 })
    }
    const trendStart = new Date(Date.UTC(monthInfo.start.getUTCFullYear(), monthInfo.start.getUTCMonth() - 11, 1))

    const employees = await prisma.employee.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, phone: true, monthlySalary: true, openingBalance: true },
    })

    const empIds = employees.map((e) => e.id)
    const [allAttendance, allPayments, trendPayments] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: { employeeId: { in: empIds } },
        select: { employeeId: true, date: true, status: true, approved: true },
      }),
      prisma.salaryPayment.findMany({
        where: { employeeId: { in: empIds } },
        select: { employeeId: true, amountPaid: true, paidDate: true },
      }),
      prisma.salaryPayment.findMany({
        where: { paidDate: { gte: trendStart } },
        select: { paidDate: true, amountPaid: true },
      }),
    ])

    const byEmpId = new Map<
      string,
      { att: typeof allAttendance; pay: typeof allPayments }
    >()
    for (const e of employees) byEmpId.set(e.id, { att: [], pay: [] })
    for (const r of allAttendance) byEmpId.get(r.employeeId)?.att.push(r)
    for (const p of allPayments) byEmpId.get(p.employeeId)?.pay.push(p)

    const rows = employees.map((e) => {
      const { att, pay } = byEmpId.get(e.id)!
      const bal = runningBalance(att, pay, e.monthlySalary, e.openingBalance)
      return {
        id: e.id,
        name: e.name,
        phone: e.phone,
        monthlySalary: e.monthlySalary.toString(),
        openingBalance: e.openingBalance.toString(),
        totalEarned: bal.totalEarned.toString(),
        totalPaid: bal.totalPaid.toString(),
        balance: bal.balance.toString(),
      }
    })

    // Build 12-month trend buckets aligned to selected month.
    const trendBuckets = new Map<string, Prisma.Decimal>()
    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(monthInfo.start.getUTCFullYear(), monthInfo.start.getUTCMonth() - (11 - i), 1))
      trendBuckets.set(toMonthStringIST(d), new Decimal(0))
    }
    for (const p of trendPayments) {
      const k = toMonthStringIST(p.paidDate)
      if (!trendBuckets.has(k)) continue
      trendBuckets.set(k, trendBuckets.get(k)!.add(new Decimal(p.amountPaid as Prisma.Decimal.Value)))
    }
    const trend = Array.from(trendBuckets.entries()).map(([m, v]) => ({ month: m, total: v.toString() }))

    const totalLabourCost12m = trend.reduce((acc, t) => acc.add(new Decimal(t.total)), new Decimal(0))

    return NextResponse.json({
      success: true,
      data: {
        month,
        rows,
        trend,
        totalLabourCost12m: totalLabourCost12m.toString(),
        generatedAt: new Date(),
      },
    })
  } catch (error) {
    console.error('overall report error', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
