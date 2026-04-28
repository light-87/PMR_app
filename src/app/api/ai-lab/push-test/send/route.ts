import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendPush, type PushSubscriptionJSON } from '@/lib/push'

export const dynamic = 'force-dynamic'

const KEY = 'push_test_subscription'

// POST - send a test push to the stored subscription
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const title: string = body.title || 'PMR Test'
    const message: string = body.body || 'Test notification from Payroll Lab'

    const setting = await prisma.systemSettings.findUnique({ where: { key: KEY } })
    if (!setting?.value) {
      return NextResponse.json(
        { success: false, error: 'No subscription stored. Subscribe first.' },
        { status: 400 }
      )
    }

    const subscription = JSON.parse(setting.value) as PushSubscriptionJSON

    const result = await sendPush(subscription, {
      title,
      body: message,
      url: '/ai-lab/payroll-lab',
      tag: 'pmr-push-test',
    })

    if (!result.ok && result.expired) {
      // Subscription gone — clean up so the UI prompts a re-subscribe.
      await prisma.systemSettings.deleteMany({ where: { key: KEY } })
      return NextResponse.json(
        { success: false, error: 'Subscription expired, please subscribe again.' },
        { status: 410 }
      )
    }

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('push-test send error', error)
    const message = error instanceof Error ? error.message : 'Failed to send'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
