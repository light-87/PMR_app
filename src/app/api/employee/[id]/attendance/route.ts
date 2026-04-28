import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { parseMonthString } from '@/lib/date-utils'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/employee/[id]/attendance?month=YYYY-MM — admin view of one employee's attendance.
export async function GET(request: NextRequest, context: Ctx) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await context.params

    const month = request.nextUrl.searchParams.get('month')
    const where: { employeeId: string; date?: { gte: Date; lt: Date } } = { employeeId: id }
    if (month) {
      try {
        const { start, end } = parseMonthString(month)
        where.date = { gte: start, lt: end }
      } catch {
        return NextResponse.json({ success: false, error: 'Invalid month' }, { status: 400 })
      }
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      orderBy: { date: 'desc' },
    })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('admin attendance GET error', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
