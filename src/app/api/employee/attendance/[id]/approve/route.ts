import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const schema = z.object({
  approve: z.boolean(),
})

type Ctx = { params: Promise<{ id: string }> }

// POST /api/employee/attendance/[id]/approve — admin approves or rejects a self-marked record.
// Reject = delete the record (employee can re-submit later).
export async function POST(request: NextRequest, context: Ctx) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await context.params
    const body = await request.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid input' }, { status: 400 })
    }

    if (parsed.data.approve) {
      const record = await prisma.attendanceRecord.update({
        where: { id },
        data: { approved: true, approvedAt: new Date() },
      })
      return NextResponse.json({ success: true, data: record })
    } else {
      await prisma.attendanceRecord.delete({ where: { id } })
      return NextResponse.json({ success: true, data: { rejected: true } })
    }
  } catch (error) {
    console.error('approve error', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
