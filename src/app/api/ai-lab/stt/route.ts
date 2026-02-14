import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSarvamApiKey, sarvamSTT } from '@/lib/sarvam'

export const dynamic = 'force-dynamic'

// Simple STT endpoint — just transcribes audio, no parsing
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

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    const languageCode = (formData.get('language') as string) || 'mr-IN'

    if (!audioFile) {
      return NextResponse.json({ success: false, error: 'No audio file provided' }, { status: 400 })
    }

    const arrayBuffer = await audioFile.arrayBuffer()
    const audioBuffer = Buffer.from(arrayBuffer)

    const sttResult = await sarvamSTT(audioBuffer, apiKey, languageCode)

    if (!sttResult.transcript || sttResult.transcript.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Could not transcribe audio. Please speak clearly and try again.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { transcript: sttResult.transcript },
    })
  } catch (error) {
    console.error('STT error:', error)
    const message = error instanceof Error ? error.message : 'Failed to transcribe audio'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
