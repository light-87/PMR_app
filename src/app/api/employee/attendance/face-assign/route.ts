import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { dateOnlyIST } from '@/lib/date-utils'

export const dynamic = 'force-dynamic'

// Re-enroll: when face-scan returns no match, the admin selects the correct employee
// and we (a) append this descriptor to that employee's faceDescriptors so future scans
// improve, and (b) mark them present today.
const schema = z.object({
  descriptor: z.array(z.number()).length(128),
  employeeId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'EXPENSE_INVENTORY')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid input' }, { status: 400 })
    }
    const { descriptor, employeeId } = parsed.data

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true, active: true, faceDescriptors: true },
    })
    if (!employee || !employee.active) {
      return NextResponse.json({ success: false, error: 'Employee not found / inactive' }, { status: 404 })
    }

    const existing = Array.isArray(employee.faceDescriptors)
      ? (employee.faceDescriptors as number[][])
      : []
    const merged = [...existing, descriptor]

    const today = dateOnlyIST()

    const [, record] = await prisma.$transaction([
      prisma.employee.update({ where: { id: employeeId }, data: { faceDescriptors: merged } }),
      prisma.attendanceRecord.upsert({
        where: { employeeId_date: { employeeId, date: today } },
        update: {
          status: 'PRESENT',
          source: 'FACE_SCAN',
          approved: true,
          approvedAt: new Date(),
        },
        create: {
          employeeId,
          date: today,
          status: 'PRESENT',
          source: 'FACE_SCAN',
          approved: true,
          approvedAt: new Date(),
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        employee: { id: employee.id, name: employee.name },
        record,
        descriptorCount: merged.length,
      },
    })
  } catch (error) {
    console.error('face-assign error', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
