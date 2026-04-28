import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { dateOnlyIST } from '@/lib/date-utils'

export const dynamic = 'force-dynamic'

const schema = z.object({
  employeeId: z.string().min(1),
  date: z.string().optional(), // ISO; if omitted → today (IST)
  status: z.enum(['PRESENT', 'ABSENT']),
  notes: z.string().max(500).optional(),
})

// POST /api/employee/attendance/admin-mark — admin manually marks/overrides attendance.
// Always approved=true; sets modified=true if updating an existing record.
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid input' }, { status: 400 })
    }

    const targetDate = parsed.data.date ? dateOnlyIST(new Date(parsed.data.date)) : dateOnlyIST()

    const existing = await prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId: parsed.data.employeeId, date: targetDate } },
    })

    const record = await prisma.attendanceRecord.upsert({
      where: { employeeId_date: { employeeId: parsed.data.employeeId, date: targetDate } },
      update: {
        status: parsed.data.status,
        source: 'ADMIN_MANUAL',
        approved: true,
        approvedAt: new Date(),
        modified: true,
        modifiedAt: new Date(),
        notes: parsed.data.notes,
      },
      create: {
        employeeId: parsed.data.employeeId,
        date: targetDate,
        status: parsed.data.status,
        source: 'ADMIN_MANUAL',
        approved: true,
        approvedAt: new Date(),
        notes: parsed.data.notes,
      },
    })

    return NextResponse.json({ success: true, data: { record, wasUpdate: !!existing } })
  } catch (error) {
    console.error('admin-mark error', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
