import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSarvamApiKey, sarvamSTT, sarvamChat, getExistingNames } from '@/lib/sarvam'
import {
  BUCKET_TYPE_LABELS,
  WAREHOUSE_LABELS,
  ACCOUNT_LABELS,
  STOCK_TYPE_LABELS,
} from '@/types'

export const dynamic = 'force-dynamic'

const VOICE_PARSE_SYSTEM_PROMPT = `You are a data entry parser for PMR Industries, a DEF (Diesel Exhaust Fluid) manufacturing company.

Your job is to parse spoken text (in Marathi, Hindi, or English) into a structured JSON format for one of three modules: inventory, expense, or stock.

## Valid Values

### Bucket Types (for inventory module):
${Object.entries(BUCKET_TYPE_LABELS).map(([key, label]) => `- "${key}" = "${label}"`).join('\n')}

### Warehouses (for inventory module):
${Object.entries(WAREHOUSE_LABELS).map(([key, label]) => `- "${key}" = "${label}"`).join('\n')}
Note: "पल्लवी" = PALLAVI, "तुलाराम" = TULARAM, "फॅक्टरी" = FACTORY

### Expense Accounts:
${Object.entries(ACCOUNT_LABELS).map(([key, label]) => `- "${key}" = "${label}"`).join('\n')}
Note: "कॅश" / "रोख" = CASH, "प्रशांत गायधने" = PRASHANT_GAYDHANE

### Stock Transaction Types:
${Object.entries(STOCK_TYPE_LABELS).map(([key, label]) => `- "${key}" = "${label}"`).join('\n')}

### Actions (for inventory):
- "STOCK" = adding/receiving buckets (स्टॉक, आले, received, added)
- "SELL" = selling/dispatching buckets (विकले, sell, sold, dispatched, गेले)

### Transaction Types (for expense):
- "INCOME" = money received (इन्कम, जमा, received, आले)
- "EXPENSE" = money spent (खर्च, दिले, paid, expense)

## Existing Names in Database
These are names already used in the system. Match the spoken name to one of these if possible:
EXISTING_NAMES_PLACEHOLDER

## Output Format
Return ONLY a JSON object (no markdown, no explanation):
{
  "module": "inventory" | "expense" | "stock",
  "date": "YYYY-MM-DD",
  "warehouse": "PALLAVI" | "TULARAM" | "FACTORY" | null,
  "bucketType": "<BucketType enum value>" | null,
  "action": "STOCK" | "SELL" | null,
  "quantity": <number> | null,
  "buyerSeller": "<matched or new name>" | null,
  "amount": <number> | null,
  "account": "<ExpenseAccount enum>" | null,
  "transactionType": "INCOME" | "EXPENSE" | null,
  "name": "<matched or new name>" | null,
  "stockType": "<StockTransactionType enum>" | null,
  "stockCategory": "UREA" | "FREE_DEF" | "FINISHED_GOODS" | null,
  "unit": "KG" | "LITERS" | "BAGS" | null,
  "description": "<description>" | null,
  "isNewName": true | false,
  "confidence": 0.0 to 1.0
}

Rules:
- If the user mentions buckets/inventory items → module = "inventory"
- If the user mentions money/payment/expense → module = "expense"
- If the user mentions urea/production/batch → module = "stock"
- Set "date" to today if not specified
- Match names to existing database names when possible (understand Marathi↔English transliteration)
- If the name doesn't match any existing name, set isNewName=true
- Set confidence based on how clear/unambiguous the input was
- Only fill fields relevant to the detected module, set others to null`

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = await getSarvamApiKey()
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Sarvam API key not configured. Please set it in AI Lab settings.' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    const languageCode = (formData.get('language') as string) || 'mr-IN'

    if (!audioFile) {
      return NextResponse.json({ success: false, error: 'No audio file provided' }, { status: 400 })
    }

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer()
    const audioBuffer = Buffer.from(arrayBuffer)

    // Step 1: Speech-to-Text
    const sttResult = await sarvamSTT(audioBuffer, apiKey, languageCode)
    const transcript = sttResult.transcript

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Could not transcribe audio. Please speak clearly and try again.' },
        { status: 400 }
      )
    }

    // Step 2: Fetch existing names for context
    const { allNames } = await getExistingNames()

    // Step 3: Parse with LLM
    const systemPrompt = VOICE_PARSE_SYSTEM_PROMPT.replace(
      'EXISTING_NAMES_PLACEHOLDER',
      allNames.length > 0 ? allNames.join(', ') : '(No existing names yet)'
    )

    const today = new Date().toISOString().split('T')[0]
    const userMessage = `Today's date is ${today}. Parse this spoken text into a data entry:\n\n"${transcript}"`

    const llmResponse = await sarvamChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      apiKey,
      { temperature: 0.1 }
    )

    // Parse the JSON response
    let parsed
    try {
      // Try to extract JSON from the response (handle if LLM wraps it in markdown)
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch {
      console.error('Failed to parse LLM response:', llmResponse)
      return NextResponse.json(
        { success: false, error: 'AI could not parse the voice input. Please try again with clearer instructions.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        transcript,
        parsed,
        existingNames: allNames,
      },
    })
  } catch (error) {
    console.error('Voice parse error:', error)
    const message = error instanceof Error ? error.message : 'Failed to process voice input'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
