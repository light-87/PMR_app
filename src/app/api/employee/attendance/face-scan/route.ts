import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { findBestEmployeeMatch, SERVER_MATCH_THRESHOLD, type Candidate } from '@/lib/face-match'
import { dateOnlyIST } from '@/lib/date-utils'

export const dynamic = 'force-dynamic'

const schema = z.object({
  descriptor: z.array(z.number()).length(128),
})

// POST /api/employee/attendance/face-scan
// Body: { descriptor: number[128] }
// Matches against all active employees' faceDescriptors and marks present-and-approved.
// Returns either the matched employee (and the new/updated record) or 404 with the probe
// echoed back so the kiosk UI can prompt the admin to assign-to-employee (re-enroll).
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'EXPENSE_INVENTORY')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid descriptor' }, { status: 400 })
    }
    const probe = parsed.data.descriptor

    const employees = await prisma.employee.findMany({
      where: { active: true, faceDescriptors: { not: { equals: null } } },
      select: { id: true, name: true, faceDescriptors: true },
    })

    const candidates: Candidate[] = employees
      .map((e) => ({
        employeeId: e.id,
        descriptors: Array.isArray(e.faceDescriptors) ? (e.faceDescriptors as number[][]) : [],
      }))
      .filter((c) => c.descriptors.length > 0)

    const match = findBestEmployeeMatch(probe, candidates, SERVER_MATCH_THRESHOLD)

    if (!match) {
      return NextResponse.json(
        {
          success: false,
          matched: false,
          error: 'No match. Admin should assign to correct employee to re-enroll.',
        },
        { status: 404 }
      )
    }

    const employee = employees.find((e) => e.id === match.employeeId)!
    const today = dateOnlyIST()

    const record = await prisma.attendanceRecord.upsert({
      where: { employeeId_date: { employeeId: employee.id, date: today } },
      update: {
        status: 'PRESENT',
        source: 'FACE_SCAN',
        approved: true,
        approvedAt: new Date(),
      },
      create: {
        employeeId: employee.id,
        date: today,
        status: 'PRESENT',
        source: 'FACE_SCAN',
        approved: true,
        approvedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      matched: true,
      data: {
        employee: { id: employee.id, name: employee.name },
        distance: match.distance,
        record,
      },
    })
  } catch (error) {
    console.error('face-scan error', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
