import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEmployeeSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await verifyEmployeeSession()
    if (!session?.employeeId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const employee = await prisma.employee.findUnique({
      where: { id: session.employeeId },
      select: {
        id: true,
        name: true,
        phone: true,
        monthlySalary: true,
        joinedDate: true,
        active: true,
      },
    })

    if (!employee || !employee.active) {
      return NextResponse.json({ success: false, error: 'Account not active' }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: employee })
  } catch (error) {
    console.error('staff me error', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
