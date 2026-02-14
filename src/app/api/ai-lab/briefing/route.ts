import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSarvamApiKey, sarvamChat } from '@/lib/sarvam'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'
import {
  BUCKET_TYPE_LABELS,
  WAREHOUSE_LABELS,
  ACCOUNT_LABELS,
} from '@/types'

export const dynamic = 'force-dynamic'

const BRIEFING_SYSTEM_PROMPT = `You are a business assistant for PMR Industries, a DEF (Diesel Exhaust Fluid) manufacturing company in India.

Generate a morning briefing in Marathi. Structure it as follows:

1. **आर्थिक सारांश (Financial Summary)** - Income, expenses, profit for yesterday
2. **इन्व्हेंटरी हायलाइट्स (Inventory Highlights)** - What moved, what's running low
3. **उत्पादन स्थिती (Production Status)** - Urea stock, DEF levels, batches needed
4. **आजचे कार्य (Today's Actions)** - Leads to follow up, visits scheduled, pending tasks
5. **सूचना (Alerts)** - Any warnings or important things to watch out for

Rules:
- Write in Marathi
- Be conversational and actionable
- Use specific numbers (amounts in ₹, quantities in buckets/kg/liters)
- If something needs urgent attention, highlight it
- Keep it concise but comprehensive
- Use Devanagari script`

export async function GET() {
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

    const now = new Date()
    const yesterday = subDays(now, 1)
    const yesterdayStart = startOfDay(yesterday)
    const yesterdayEnd = endOfDay(yesterday)
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)

    // Fetch all data in parallel
    const [
      yesterdayExpenses,
      todayExpenses,
      yesterdayInventory,
      todayInventory,
      recentStock,
      todayLeads,
      allLeads,
    ] = await Promise.all([
      // Yesterday's expenses
      prisma.expenseTransaction.findMany({
        where: { date: { gte: yesterdayStart, lte: yesterdayEnd } },
      }),
      // Today's expenses so far
      prisma.expenseTransaction.findMany({
        where: { date: { gte: todayStart, lte: todayEnd } },
      }),
      // Yesterday's inventory
      prisma.inventoryTransaction.findMany({
        where: { date: { gte: yesterdayStart, lte: yesterdayEnd } },
      }),
      // Today's inventory so far
      prisma.inventoryTransaction.findMany({
        where: { date: { gte: todayStart, lte: todayEnd } },
      }),
      // Recent stock transactions (last 7 days)
      prisma.stockTransaction.findMany({
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: 50,
      }),
      // Today's follow-up leads
      prisma.lead.findMany({
        where: {
          OR: [
            { nextActionDate: { gte: todayStart, lte: todayEnd } },
            { visitDate: { gte: todayStart, lte: todayEnd } },
          ],
        },
      }),
      // All active leads
      prisma.lead.findMany({
        where: { status: { notIn: ['DEAD', 'CONVERTED'] } },
      }),
    ])

    // Process yesterday's data
    const yIncome = yesterdayExpenses.filter(e => e.type === 'INCOME').reduce((s, e) => s + Number(e.amount), 0)
    const yExpense = yesterdayExpenses.filter(e => e.type === 'EXPENSE').reduce((s, e) => s + Number(e.amount), 0)

    const yAccountBreakdown = yesterdayExpenses.reduce((acc, e) => {
      const key = `${ACCOUNT_LABELS[e.account as keyof typeof ACCOUNT_LABELS]} (${e.type})`
      acc[key] = (acc[key] || 0) + Number(e.amount)
      return acc
    }, {} as Record<string, number>)

    // Inventory stats
    const yStocked = yesterdayInventory.filter(t => t.action === 'STOCK').reduce((s, t) => s + t.quantity, 0)
    const ySold = yesterdayInventory.filter(t => t.action === 'SELL').reduce((s, t) => s + t.quantity, 0)

    const yByType = yesterdayInventory.reduce((acc, t) => {
      const label = BUCKET_TYPE_LABELS[t.bucketType as keyof typeof BUCKET_TYPE_LABELS]
      if (!acc[label]) acc[label] = { stocked: 0, sold: 0 }
      if (t.action === 'STOCK') acc[label].stocked += t.quantity
      else acc[label].sold += t.quantity
      return acc
    }, {} as Record<string, { stocked: number; sold: number }>)

    // Current stock levels (latest running totals)
    const latestTotals: Record<string, number> = {}
    const seenCat = new Set<string>()
    for (const t of recentStock) {
      if (!seenCat.has(t.category)) {
        seenCat.add(t.category)
        latestTotals[t.category] = t.runningTotal
      }
    }

    const ureaStock = latestTotals['UREA'] || 0
    const defStock = latestTotals['FREE_DEF'] || 0
    const batchesPossible = Math.floor(ureaStock / 360)

    // Build context for LLM
    const context = `Date: ${format(now, 'dd MMMM yyyy')} (Today)
Yesterday: ${format(yesterday, 'dd MMMM yyyy')}

== YESTERDAY'S FINANCIAL ==
Income: ₹${yIncome.toLocaleString('en-IN')}
Expenses: ₹${yExpense.toLocaleString('en-IN')}
Net Profit: ₹${(yIncome - yExpense).toLocaleString('en-IN')}
Total Transactions: ${yesterdayExpenses.length}
Account Breakdown: ${JSON.stringify(yAccountBreakdown)}

== YESTERDAY'S INVENTORY ==
Buckets Stocked: ${yStocked}
Buckets Sold: ${ySold}
By Type: ${JSON.stringify(yByType)}

== TODAY SO FAR ==
Expense transactions: ${todayExpenses.length}
Inventory transactions: ${todayInventory.length}

== PRODUCTION STATUS ==
Current Urea Stock: ${ureaStock} kg (${Math.round(ureaStock / 45)} bags)
Current Free DEF Stock: ${defStock} liters
Batches possible with current urea: ${batchesPossible}
Note: 1 batch = 360kg urea = 1000L DEF

== LEADS / FOLLOW-UPS ==
Today's follow-ups: ${todayLeads.length}
${todayLeads.map(l => `- ${l.name} (${l.phone}) - ${l.nextActionType || 'Follow up'}${l.visitDate ? ' [VISIT]' : ''}`).join('\n')}
Total active leads: ${allLeads.length}

== ALERTS ==
${ureaStock < 360 ? '⚠️ URGENT: Not enough urea for even 1 batch!' : ''}
${ureaStock < 720 ? '⚠️ Low urea - only enough for ' + batchesPossible + ' batch(es)' : ''}
${defStock < 500 ? '⚠️ Low DEF stock: ' + defStock + ' liters' : ''}
${yIncome < yExpense ? '⚠️ Yesterday had negative cash flow' : ''}
${todayLeads.length > 0 ? '📞 You have ' + todayLeads.length + ' follow-up(s) today' : ''}`

    const briefing = await sarvamChat(
      [
        { role: 'system', content: BRIEFING_SYSTEM_PROMPT },
        { role: 'user', content: `Generate the morning briefing based on this data:\n\n${context}` },
      ],
      apiKey,
      { temperature: 0.4, maxTokens: 2048 }
    )

    return NextResponse.json({
      success: true,
      data: {
        briefing,
        date: format(now, 'yyyy-MM-dd'),
        summary: {
          yesterdayIncome: yIncome,
          yesterdayExpense: yExpense,
          yesterdayNet: yIncome - yExpense,
          bucketsSold: ySold,
          bucketsStocked: yStocked,
          ureaStock,
          defStock,
          todayFollowUps: todayLeads.length,
        },
      },
    })
  } catch (error) {
    console.error('Briefing error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate briefing'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
