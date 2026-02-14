import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getExistingNames } from '@/lib/sarvam'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const names = await getExistingNames()
    return NextResponse.json({ success: true, data: names })
  } catch (error) {
    console.error('Error fetching names:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch names' }, { status: 500 })
  }
}
