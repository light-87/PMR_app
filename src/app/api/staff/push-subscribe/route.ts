import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyEmployeeSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// POST /api/staff/push-subscribe — upsert this device's push subscription onto the employee row.
// Last-device-wins: any prior subscription is overwritten.
export async function POST(request: NextRequest) {
  try {
    const session = await verifyEmployeeSession()
    if (!session?.employeeId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const subscription = await request.json()
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ success: false, error: 'Invalid subscription' }, { status: 400 })
    }

    await prisma.employee.update({
      where: { id: session.employeeId },
      data: { pushSubscription: subscription },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('staff push-subscribe error', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}

// DELETE /api/staff/push-subscribe — clear the stored subscription (e.g. on permission revoke).
export async function DELETE() {
  try {
    const session = await verifyEmployeeSession()
    if (!session?.employeeId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    await prisma.employee.update({
      where: { id: session.employeeId },
      data: { pushSubscription: Prisma.JsonNull },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('staff push-subscribe DELETE error', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
