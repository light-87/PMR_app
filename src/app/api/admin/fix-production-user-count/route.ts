import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface CorrectionDetails {
  oldValue: number
  newValue: number
  difference: number
  percentageChange: number
  recordsAffected: number
  timestamp: string
  appliedBy: string
}

// GET - Fetch current production user count
async function handleGetCurrent() {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    // Query the current production user count
    // This assumes you have a field in your database tracking this
    // Adjust the query based on your actual schema
    const leadsCount = await prisma.lead.count()

    // If you need to track it differently, replace above with:
    // const setting = await prisma.systemSettings.findUnique({
    //   where: { key: 'PRODUCTION_USER_COUNT' }
    // })
    // const currentValue = setting?.value ? parseInt(setting.value) : 0

    return NextResponse.json({
      success: true,
      currentValue: leadsCount,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Get current value error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch current value' },
      { status: 500 }
    )
  }
}

// POST - Preview or Apply the fix
async function handleFix(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const { action, newValue } = await request.json()

    if (!action || !['preview', 'apply'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Invalid action. Use "preview" or "apply".' },
        { status: 400 }
      )
    }

    if (typeof newValue !== 'number' || newValue < 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid new value. Must be a non-negative number.' },
        { status: 400 }
      )
    }

    // Get current value
    const leadsCount = await prisma.lead.count()
    const oldValue = leadsCount

    // Calculate correction details
    const difference = Math.abs(oldValue - newValue)
    const percentageChange = ((difference / oldValue) * 100) * (oldValue > newValue ? -1 : 1)

    const details: CorrectionDetails = {
      oldValue,
      newValue,
      difference,
      percentageChange,
      recordsAffected: 1, // If using SystemSettings, this would be 1 record
      timestamp: new Date().toISOString(),
      appliedBy: session.role,
    }

    // If action is "preview", just return the calculation
    if (action === 'preview') {
      return NextResponse.json({
        success: true,
        message: 'Preview generated successfully',
        details,
        log: [
          `FROM: ${oldValue}`,
          `TO: ${newValue}`,
          `CHANGE: -${difference} (${percentageChange.toFixed(1)}%)`,
          `APPLIED BY: ${session.role}`,
          `TIMESTAMP: ${details.timestamp}`,
        ],
      })
    }

    // If action is "apply", update the database
    if (action === 'apply') {
      // Update the production user count
      // Option 1: If storing in SystemSettings
      await prisma.systemSettings.upsert({
        where: { key: 'PRODUCTION_USER_COUNT' },
        create: {
          key: 'PRODUCTION_USER_COUNT',
          value: String(newValue),
        },
        update: {
          value: String(newValue),
        },
      })

      // Option 2: If you need to update an actual data record,
      // add that query here

      // Log the correction for audit purposes
      const logMessage = `[FIX-PRODUCTION-USER-COUNT] OLD: ${oldValue} → NEW: ${newValue} | CHANGE: -${difference} (-${Math.abs(percentageChange).toFixed(1)}%) | APPLIED BY: ${session.role} | TIME: ${details.timestamp}`

      console.log(logMessage)

      // Optionally store audit log in database
      // await prisma.systemSettings.create({
      //   data: {
      //     key: `AUDIT_FIX_PRODUCTION_${Date.now()}`,
      //     value: logMessage
      //   }
      // })

      return NextResponse.json({
        success: true,
        message: 'Production user count fixed successfully',
        details,
        log: [
          `✅ CORRECTION APPLIED`,
          `FROM: ${oldValue}`,
          `TO: ${newValue}`,
          `REDUCTION: -${difference} users (-${Math.abs(percentageChange).toFixed(1)}%)`,
          `APPLIED BY: ${session.role}`,
          `TIMESTAMP: ${details.timestamp}`,
          `STATUS: Successfully updated in database`,
        ],
      })
    }
  } catch (error) {
    console.error('Production user count fix error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to process fix' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')

  if (action === 'get-current') {
    return handleGetCurrent()
  }

  return NextResponse.json(
    { success: false, message: 'Invalid query parameter' },
    { status: 400 }
  )
}

export async function POST(request: NextRequest) {
  return handleFix(request)
}
