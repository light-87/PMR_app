import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const schema = z.object({
  id: z.string().min(1),
  status: z.enum(['PRESENT', 'ABSENT']).optional(),
  approved: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional(),
})

// PUT /api/employee/attendance/edit — admin edits an existing AttendanceRecord.
// Always sets modified=true, modifiedAt=now (audit trail visible to admin).
export async function PUT(request: NextRequest) {
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
    const { id, status, approved, notes } = parsed.data

    const updateData: {
      status?: 'PRESENT' | 'ABSENT'
      approved?: boolean
      approvedAt?: Date | null
      notes?: string | null
      modified: boolean
      modifiedAt: Date
    } = { modified: true, modifiedAt: new Date() }
    if (status !== undefined) updateData.status = status
    if (approved !== undefined) {
      updateData.approved = approved
      updateData.approvedAt = approved ? new Date() : null
    }
    if (notes !== undefined) updateData.notes = notes

    const record = await prisma.attendanceRecord.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('attendance edit error', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
