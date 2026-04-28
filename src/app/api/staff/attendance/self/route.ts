import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEmployeeSession } from '@/lib/auth'
import { dateOnlyIST } from '@/lib/date-utils'

export const dynamic = 'force-dynamic'

// POST /api/staff/attendance/self — employee self-marks today as PRESENT (pending admin approval).
// Idempotent: re-posting the same day re-asserts the record but does not bypass approval.
export async function POST() {
  try {
    const session = await verifyEmployeeSession()
    if (!session?.employeeId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const employee = await prisma.employee.findUnique({
      where: { id: session.employeeId },
      select: { id: true, active: true },
    })
    if (!employee || !employee.active) {
      return NextResponse.json({ success: false, error: 'Account not active' }, { status: 403 })
    }

    const today = dateOnlyIST()

    // Don't overwrite an admin-approved record with a pending self-mark.
    const existing = await prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId: employee.id, date: today } },
    })
    if (existing && existing.approved) {
      return NextResponse.json({
        success: true,
        data: existing,
        message: 'Already marked for today.',
      })
    }

    const record = await prisma.attendanceRecord.upsert({
      where: { employeeId_date: { employeeId: employee.id, date: today } },
      update: {
        status: 'PRESENT',
        source: 'EMPLOYEE_SELF',
        approved: false,
        approvedAt: null,
      },
      create: {
        employeeId: employee.id,
        date: today,
        status: 'PRESENT',
        source: 'EMPLOYEE_SELF',
        approved: false,
      },
    })

    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('staff self-mark error', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
