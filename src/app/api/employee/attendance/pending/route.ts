import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/employee/attendance/pending — list all unapproved AttendanceRecords (admin queue).
export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const records = await prisma.attendanceRecord.findMany({
      where: { approved: false },
      orderBy: [{ date: 'desc' }, { markedAt: 'desc' }],
      select: {
        id: true,
        date: true,
        markedAt: true,
        status: true,
        source: true,
        notes: true,
        employee: { select: { id: true, name: true, phone: true } },
      },
    })

    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('attendance pending error', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
