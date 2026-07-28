import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSession, isMasterPin } from '@/lib/auth'
import { triggerBackupIfNeeded } from '@/lib/backup'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pin } = body

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Invalid PIN format' },
        { status: 400 }
      )
    }

    // Master PIN check runs before the DB lookup so admin access survives the owner
    // changing his PIN — or the Pin table being wiped by a factory reset.
    if (isMasterPin(pin)) {
      await createSession('master', 'ADMIN')
      triggerBackupIfNeeded()

      return NextResponse.json({
        success: true,
        role: 'ADMIN',
      })
    }

    if (pin.length !== 4) {
      return NextResponse.json(
        { success: false, message: 'Invalid PIN format' },
        { status: 400 }
      )
    }

    // Find PIN in database
    const pinRecord = await prisma.pin.findUnique({
      where: { pinNumber: pin },
    })

    if (!pinRecord) {
      return NextResponse.json(
        { success: false, message: 'Invalid PIN' },
        { status: 401 }
      )
    }

    // Create session
    await createSession(pinRecord.id, pinRecord.role)

    // Trigger backup if needed (non-blocking, runs in background)
    // This checks if last backup was more than 24 hours ago
    triggerBackupIfNeeded()

    return NextResponse.json({
      success: true,
      role: pinRecord.role,
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, message: 'Something went wrong' },
      { status: 500 }
    )
  }
}
