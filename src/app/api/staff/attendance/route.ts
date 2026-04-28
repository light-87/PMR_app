import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEmployeeSession } from '@/lib/auth'
import { parseMonthString } from '@/lib/date-utils'

export const dynamic = 'force-dynamic'

// GET /api/staff/attendance?month=YYYY-MM (defaults to all-time if omitted; capped to current month if no param)
export async function GET(request: NextRequest) {
  try {
    const session = await verifyEmployeeSession()
    if (!session?.employeeId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const month = request.nextUrl.searchParams.get('month')
    const where: { employeeId: string; date?: { gte: Date; lt: Date } } = { employeeId: session.employeeId }
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
      select: {
        id: true,
        date: true,
        markedAt: true,
        status: true,
        source: true,
        approved: true,
        approvedAt: true,
        modified: true,
        modifiedAt: true,
        notes: true,
      },
    })

    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('staff attendance GET error', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
