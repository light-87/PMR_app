import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSarvamApiKey, sarvamTTS } from '@/lib/sarvam'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = await getSarvamApiKey()
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Sarvam API key not configured' },
        { status: 400 }
      )
    }

    const { text, language } = await request.json()
    if (!text) {
      return NextResponse.json({ success: false, error: 'No text provided' }, { status: 400 })
    }

    const audioBuffer = await sarvamTTS(text, apiKey, language || 'mr-IN')
    const uint8Array = new Uint8Array(audioBuffer)

    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('TTS error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate speech'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
