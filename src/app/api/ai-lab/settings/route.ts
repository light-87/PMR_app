import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSarvamApiKey, setSarvamApiKey } from '@/lib/sarvam'

export const dynamic = 'force-dynamic'

// GET - Check if API key is set
export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = await getSarvamApiKey()
    return NextResponse.json({
      success: true,
      data: { hasApiKey: !!apiKey, maskedKey: apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : null },
    })
  } catch (error) {
    console.error('Error checking API key:', error)
    return NextResponse.json({ success: false, error: 'Failed to check API key' }, { status: 500 })
  }
}

// POST - Save API key
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { apiKey } = await request.json()
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid API key' }, { status: 400 })
    }

    await setSarvamApiKey(apiKey.trim())
    return NextResponse.json({ success: true, message: 'API key saved successfully' })
  } catch (error) {
    console.error('Error saving API key:', error)
    return NextResponse.json({ success: false, error: 'Failed to save API key' }, { status: 500 })
  }
}
