import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { dateOnlyIST } from '@/lib/date-utils'

export const dynamic = 'force-dynamic'

// GET /api/employee/attendance/today — list today's attendance for all active employees.
// Accessible by ADMIN and EXPENSE_INVENTORY.
export async function GET() {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'EXPENSE_INVENTORY')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const today = dateOnlyIST()

    // Get all active employees
    const employees = await prisma.employee.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        phone: true,
      },
    })

    // Get today's attendance records
    const records = await prisma.attendanceRecord.findMany({
      where: { date: today },
      select: {
        employeeId: true,
        status: true,
        source: true,
        approved: true,
        markedAt: true,
      },
    })

    // Build a map of employeeId -> record
    const recordMap = new Map(records.map(r => [r.employeeId, r]))

    // Merge employees with their today's status
    const data = employees.map(emp => {
      const record = recordMap.get(emp.id)
      return {
        id: emp.id,
        name: emp.name,
        phone: emp.phone,
        status: record ? record.status : null,         // null = not marked
        source: record ? record.source : null,
        approved: record ? record.approved : null,
        markedAt: record ? record.markedAt : null,
      }
    })

    // Summary counts
    const presentApproved = data.filter(d => d.status === 'PRESENT' && d.approved).length
    const presentPending = data.filter(d => d.status === 'PRESENT' && d.approved === false).length
    const absent = data.filter(d => d.status === 'ABSENT' && d.approved).length
    const notMarked = data.filter(d => d.status === null).length

    return NextResponse.json({
      success: true,
      data,
      summary: {
        total: employees.length,
        presentApproved,
        presentPending,
        absent,
        notMarked,
      },
    })
  } catch (error) {
    console.error('attendance today error', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
