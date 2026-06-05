import { prisma } from './prisma'
import OpenAI from 'openai'

const SARVAM_BASE_URL = 'https://api.sarvam.ai'

// Get API key from SystemSettings
export async function getSarvamApiKey(): Promise<string | null> {
  const setting = await prisma.systemSettings.findUnique({
    where: { key: 'sarvam_api_key' },
  })
  return setting?.value || null
}

// Save API key to SystemSettings
export async function setSarvamApiKey(apiKey: string): Promise<void> {
  await prisma.systemSettings.upsert({
    where: { key: 'sarvam_api_key' },
    update: { value: apiKey },
    create: { key: 'sarvam_api_key', value: apiKey },
  })
}

// Get OpenAI-compatible client for Sarvam Chat API
export function getSarvamChatClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: `${SARVAM_BASE_URL}/v1`,
  })
}

// Speech-to-Text using Sarvam Saaras v3
export async function sarvamSTT(
  audioBuffer: Buffer,
  apiKey: string,
  languageCode: string = 'mr-IN'
): Promise<{ transcript: string; language_code: string }> {
  const formData = new FormData()
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/webm' })
  formData.append('file', blob, 'audio.webm')
  formData.append('model', 'saaras:v3')
  formData.append('language_code', languageCode)
  formData.append('mode', 'transcribe')

  const response = await fetch(`${SARVAM_BASE_URL}/speech-to-text`, {
    method: 'POST',
    headers: {
      'API-Subscription-Key': apiKey,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Sarvam STT failed: ${response.status} - ${error}`)
  }

  return response.json()
}

// Chat completion using Sarvam-30B (OpenAI-compatible)
export async function sarvamChat(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  apiKey: string,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const client = getSarvamChatClient(apiKey)

  const completion = await client.chat.completions.create({
    model: 'sarvam-30b',
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 2048,
  })

  return completion.choices[0]?.message?.content || ''
}

// Translation using Sarvam Mayura
export async function sarvamTranslate(
  text: string,
  sourceLang: string,
  targetLang: string,
  apiKey: string
): Promise<string> {
  const response = await fetch(`${SARVAM_BASE_URL}/translate`, {
    method: 'POST',
    headers: {
      'API-Subscription-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      source_language_code: sourceLang,
      target_language_code: targetLang,
      model: 'mayura:v1',
      mode: 'formal',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Sarvam Translate failed: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.translated_text
}

// Text-to-Speech using Sarvam Bulbul
export async function sarvamTTS(
  text: string,
  apiKey: string,
  languageCode: string = 'mr-IN'
): Promise<Buffer> {
  const response = await fetch(`${SARVAM_BASE_URL}/text-to-speech`, {
    method: 'POST',
    headers: {
      'API-Subscription-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: [text],
      target_language_code: languageCode,
      model: 'bulbul:v2',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Sarvam TTS failed: ${response.status} - ${error}`)
  }

  const data = await response.json()
  // Sarvam TTS returns base64 encoded audio
  return Buffer.from(data.audios[0], 'base64')
}

// Fetch all existing unique names from the database for AI-powered name matching
export async function getExistingNames(): Promise<{
  inventoryNames: string[]
  expenseNames: string[]
  allNames: string[]
}> {
  const [inventoryNames, expenseNames] = await Promise.all([
    prisma.inventoryTransaction.findMany({
      select: { buyerSeller: true },
      distinct: ['buyerSeller'],
      where: { buyerSeller: { not: '' } },
    }),
    prisma.expenseTransaction.findMany({
      select: { name: true },
      distinct: ['name'],
      where: { name: { not: '' } },
    }),
  ])

  const invNames = inventoryNames.map((n) => n.buyerSeller)
  const expNames = expenseNames.map((n) => n.name)
  const allNames = [...new Set([...invNames, ...expNames])]

  return {
    inventoryNames: invNames,
    expenseNames: expNames,
    allNames,
  }
}
