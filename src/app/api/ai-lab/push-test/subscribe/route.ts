import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const KEY = 'push_test_subscription'

// POST - upsert this client's push subscription (Phase 0 lab only)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const subscription = await request.json()
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ success: false, error: 'Invalid subscription' }, { status: 400 })
    }

    const value = JSON.stringify(subscription)
    await prisma.systemSettings.upsert({
      where: { key: KEY },
      update: { value },
      create: { key: KEY, value },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('push-test subscribe error', error)
    return NextResponse.json({ success: false, error: 'Failed to save subscription' }, { status: 500 })
  }
}

// DELETE - clear stored subscription
export async function DELETE() {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    await prisma.systemSettings.deleteMany({ where: { key: KEY } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('push-test unsubscribe error', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}

// GET - check whether a subscription is stored
export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const setting = await prisma.systemSettings.findUnique({ where: { key: KEY } })
    return NextResponse.json({ success: true, data: { hasSubscription: !!setting?.value } })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
