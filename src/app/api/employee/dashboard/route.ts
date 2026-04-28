import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { runningBalance, calculateForMonth } from '@/lib/salary'
import {
  dateOnlyIST,
  parseMonthString,
  toMonthStringIST,
} from '@/lib/date-utils'

export const dynamic = 'force-dynamic'

const { Decimal } = Prisma

// GET /api/employee/dashboard?month=YYYY-MM
// One aggregated query for the admin dashboard so we don't N+1 the UI.
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
    const { start: monthStart, end: monthEnd, daysInMonth } = monthInfo

    // 6-month trend window — start of (current-5) months ago.
    const trendStart = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() - 5, 1))

    const today = dateOnlyIST()

    const [activeEmployees, allEmployees, attendance, payments, pendingCount, trendPayments] = await Promise.all([
      prisma.employee.findMany({
        where: { active: true },
        select: { id: true, name: true, monthlySalary: true, openingBalance: true, faceDescriptors: true },
        orderBy: { name: 'asc' },
      }),
      prisma.employee.count({}),
      prisma.attendanceRecord.findMany({
        where: { date: { gte: monthStart, lt: monthEnd } },
        select: {
          id: true,
          employeeId: true,
          date: true,
          status: true,
          source: true,
          approved: true,
          modified: true,
        },
      }),
      prisma.salaryPayment.findMany({
        where: { paidDate: { gte: monthStart, lt: monthEnd } },
        select: { employeeId: true, amountPaid: true },
      }),
      prisma.attendanceRecord.count({ where: { approved: false } }),
      prisma.salaryPayment.findMany({
        where: { paidDate: { gte: trendStart } },
        select: { paidDate: true, amountPaid: true },
      }),
    ])

    const activeIds = new Set(activeEmployees.map((e) => e.id))

    // Today's attendance count (only active employees count).
    const todayKey = today.toISOString()
    const todayPresent = attendance.filter(
      (r) =>
        activeIds.has(r.employeeId) &&
        r.status === 'PRESENT' &&
        r.approved &&
        new Date(r.date).toISOString() === todayKey
    ).length

    // Per-employee payments-this-month aggregate.
    const paidThisMonthByEmp = new Map<string, Prisma.Decimal>()
    for (const p of payments) {
      const cur = paidThisMonthByEmp.get(p.employeeId) ?? new Decimal(0)
      paidThisMonthByEmp.set(p.employeeId, cur.add(new Decimal(p.amountPaid as Prisma.Decimal.Value)))
    }

    // Per-employee running balance — needs full attendance + full payments.
    const allEmpIds = activeEmployees.map((e) => e.id)
    const [allAttendance, allPayments] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: { employeeId: { in: allEmpIds } },
        select: { employeeId: true, date: true, status: true, approved: true },
      }),
      prisma.salaryPayment.findMany({
        where: { employeeId: { in: allEmpIds } },
        select: { employeeId: true, amountPaid: true },
      }),
    ])

    const attendanceByEmp = new Map<string, typeof allAttendance>()
    for (const r of allAttendance) {
      const arr = attendanceByEmp.get(r.employeeId) ?? []
      arr.push(r)
      attendanceByEmp.set(r.employeeId, arr)
    }
    const paymentsByEmp = new Map<string, typeof allPayments>()
    for (const p of allPayments) {
      const arr = paymentsByEmp.get(p.employeeId) ?? []
      arr.push(p)
      paymentsByEmp.set(p.employeeId, arr)
    }

    let totalPending = new Decimal(0)
    let overpaidCount = 0
    let noFaceCount = 0

    const byEmployee = activeEmployees.map((e) => {
      const empAtt = attendanceByEmp.get(e.id) ?? []
      const empPay = paymentsByEmp.get(e.id) ?? []
      const balance = runningBalance(empAtt, empPay, e.monthlySalary, e.openingBalance)
      const monthCalc = calculateForMonth(empAtt, e.monthlySalary, month)
      const paidThisMonth = paidThisMonthByEmp.get(e.id) ?? new Decimal(0)

      totalPending = totalPending.add(balance.balance)
      if (Number(balance.balance) < 0) overpaidCount++
      if (!Array.isArray(e.faceDescriptors) || (e.faceDescriptors as number[][]).length === 0) {
        noFaceCount++
      }

      return {
        id: e.id,
        name: e.name,
        monthlySalary: e.monthlySalary.toString(),
        openingBalance: e.openingBalance.toString(),
        daysAttended: monthCalc.daysAttended,
        daysInMonth: monthCalc.daysInMonth,
        calculatedAmount: monthCalc.calculatedAmount.toString(),
        paidThisMonth: paidThisMonth.toString(),
        balance: balance.balance.toString(),
        hasFace: Array.isArray(e.faceDescriptors) && (e.faceDescriptors as number[][]).length > 0,
      }
    })

    // Heat-map matrix: rows=active employees, cols=day index (0..daysInMonth-1).
    // Cell value: 0 none, 1 pending, 2 present, 3 absent. Bit 4 (8) flags "modified".
    const heatmap = activeEmployees.map((e) => {
      const days = new Array<number>(daysInMonth).fill(0)
      const empMonthAtt = attendance.filter((r) => r.employeeId === e.id)
      for (const r of empMonthAtt) {
        const dayIndex = new Date(r.date).getUTCDate() - 1
        let v = 0
        if (!r.approved) v = 1
        else if (r.status === 'PRESENT') v = 2
        else if (r.status === 'ABSENT') v = 3
        if (r.modified) v |= 8
        days[dayIndex] = v
      }
      return { id: e.id, name: e.name, days }
    })

    // Today's per-employee status (for top KPI breakdown).
    const todayByEmp: Record<string, 'PRESENT' | 'ABSENT' | 'PENDING' | 'NONE'> = {}
    for (const e of activeEmployees) todayByEmp[e.id] = 'NONE'
    for (const r of attendance) {
      if (new Date(r.date).toISOString() !== todayKey) continue
      if (!activeIds.has(r.employeeId)) continue
      todayByEmp[r.employeeId] = !r.approved
        ? 'PENDING'
        : r.status === 'PRESENT'
          ? 'PRESENT'
          : 'ABSENT'
    }

    // 6-month labour cost trend (in IST month buckets).
    const trendBuckets = new Map<string, Prisma.Decimal>()
    for (let i = 0; i < 6; i++) {
      const d = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() - (5 - i), 1))
      trendBuckets.set(toMonthStringIST(d), new Decimal(0))
    }
    for (const p of trendPayments) {
      const key = toMonthStringIST(p.paidDate)
      if (!trendBuckets.has(key)) continue
      trendBuckets.set(key, trendBuckets.get(key)!.add(new Decimal(p.amountPaid as Prisma.Decimal.Value)))
    }
    const trend = Array.from(trendBuckets.entries()).map(([m, v]) => ({ month: m, total: v.toString() }))

    const labourCostThisMonth = payments.reduce(
      (acc, p) => acc.add(new Decimal(p.amountPaid as Prisma.Decimal.Value)),
      new Decimal(0)
    )

    return NextResponse.json({
      success: true,
      data: {
        month,
        kpis: {
          activeCount: activeEmployees.length,
          totalCount: allEmployees,
          todayPresent,
          todayTotal: activeEmployees.length,
          labourCostThisMonth: labourCostThisMonth.toString(),
          totalPending: totalPending.toString(),
          pendingSelfMarks: pendingCount,
          noFaceCount,
          overpaidCount,
        },
        byEmployee,
        heatmap: { daysInMonth, rows: heatmap },
        todayByEmp,
        trend,
      },
    })
  } catch (error) {
    console.error('dashboard error', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
