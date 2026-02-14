import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSarvamApiKey, sarvamChat } from '@/lib/sarvam'
import { prisma } from '@/lib/prisma'
import { subDays, format, startOfDay, endOfDay } from 'date-fns'
import { BUCKET_TYPE_LABELS, WAREHOUSE_LABELS } from '@/types'

export const dynamic = 'force-dynamic'

const ADVISOR_SYSTEM_PROMPT = `You are a production planning advisor for PMR Industries, a DEF (Diesel Exhaust Fluid) manufacturing company.

Production formula:
- 360kg urea + water = 1000 liters Free DEF (1 batch)
- 1 urea bag = 45kg
- 1 batch needs 8 bags (360kg)
- Free DEF is then filled into branded buckets of various types (10L or 20L)

Analyze the provided data and give production recommendations in Marathi:

1. **आज बॅच तयार करावा का? (Should we produce today?)** - Yes/No with clear reasoning
2. **पुढील 7 दिवसांचे नियोजन (Next 7 days plan)** - How many batches, when
3. **कोणत्या बकेट प्रकाराला प्राधान्य द्यावे? (Bucket priority)** - Based on sales velocity vs stock
4. **युरिया ऑर्डर (Urea order)** - Do we need more? When to order?
5. **धोके आणि संधी (Risks & Opportunities)** - Stockout warnings, demand trends

Rules:
- Write in Marathi (Devanagari script)
- Be specific with numbers (kg, liters, bags, batches)
- Give actionable, concrete recommendations
- Flag urgent issues prominently
- Consider lead activity for upcoming demand`

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
    const thirtyDaysAgo = subDays(now, 30)

    // Fetch all data in parallel
    const [
      recentStockTx,
      last30DaysSales,
      last30DaysStock,
      currentInventory,
      activeLeads,
    ] = await Promise.all([
      // Recent stock transactions for current levels
      prisma.stockTransaction.findMany({
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: 100,
      }),
      // Last 30 days of bucket sales
      prisma.inventoryTransaction.findMany({
        where: {
          action: 'SELL',
          date: { gte: startOfDay(thirtyDaysAgo), lte: endOfDay(now) },
        },
        orderBy: { date: 'desc' },
      }),
      // Last 30 days of bucket stocking
      prisma.inventoryTransaction.findMany({
        where: {
          action: 'STOCK',
          date: { gte: startOfDay(thirtyDaysAgo), lte: endOfDay(now) },
        },
        orderBy: { date: 'desc' },
      }),
      // Current inventory levels (latest running totals)
      prisma.inventoryTransaction.findMany({
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: 500,
      }),
      // Active leads near conversion
      prisma.lead.findMany({
        where: {
          status: { in: ['INTERESTED', 'VISIT_SCHEDULED'] },
        },
      }),
    ])

    // Current stock levels
    const stockLevels: Record<string, number> = {}
    const seenCat = new Set<string>()
    for (const t of recentStockTx) {
      if (!seenCat.has(t.category)) {
        seenCat.add(t.category)
        stockLevels[t.category] = t.runningTotal
      }
    }

    const ureaStock = stockLevels['UREA'] || 0
    const defStock = stockLevels['FREE_DEF'] || 0
    const batchesPossible = Math.floor(ureaStock / 360)

    // Recent production batches
    const recentBatches = recentStockTx.filter(t => t.type === 'PRODUCE_BATCH')
    const recentUreaAdds = recentStockTx.filter(t => t.type === 'ADD_UREA')

    // Sales velocity per bucket type (last 30 days)
    const salesByType: Record<string, number> = {}
    for (const t of last30DaysSales) {
      salesByType[t.bucketType] = (salesByType[t.bucketType] || 0) + t.quantity
    }

    // Daily sales average
    const totalSold = last30DaysSales.reduce((s, t) => s + t.quantity, 0)
    const avgDailySales = Math.round(totalSold / 30)

    // Current inventory per type per warehouse
    const inventoryMap: Record<string, number> = {}
    const seenInv = new Set<string>()
    for (const t of currentInventory) {
      const key = `${t.bucketType}-${t.warehouse}`
      if (!seenInv.has(key)) {
        seenInv.add(key)
        inventoryMap[key] = t.runningTotal
      }
    }

    // Build context
    const context = `Date: ${format(now, 'dd MMMM yyyy')}

== CURRENT RAW MATERIAL STATUS ==
Urea Stock: ${ureaStock} kg (${Math.round(ureaStock / 45)} bags)
Free DEF Stock: ${defStock} liters
Batches possible with current urea: ${batchesPossible}

== RECENT PRODUCTION (last 30 days) ==
Batches produced: ${recentBatches.length}
${recentBatches.slice(0, 10).map(b => `  ${format(b.date, 'dd/MM')}: ${b.quantity} liters`).join('\n')}
Urea added: ${recentUreaAdds.length} times
${recentUreaAdds.slice(0, 5).map(u => `  ${format(u.date, 'dd/MM')}: ${u.quantity} ${u.unit}`).join('\n')}

== SALES VELOCITY (last 30 days) ==
Total buckets sold: ${totalSold}
Average daily sales: ~${avgDailySales} buckets/day
By Bucket Type:
${Object.entries(salesByType)
  .sort((a, b) => b[1] - a[1])
  .map(([type, qty]) => `  ${BUCKET_TYPE_LABELS[type as keyof typeof BUCKET_TYPE_LABELS] || type}: ${qty} (${Math.round(qty / 30)}/day)`)
  .join('\n')}

== CURRENT INVENTORY (buckets in stock) ==
${Object.entries(inventoryMap)
  .filter(([, qty]) => qty > 0)
  .map(([key, qty]) => {
    const [bt, wh] = key.split('-')
    return `  ${BUCKET_TYPE_LABELS[bt as keyof typeof BUCKET_TYPE_LABELS] || bt} at ${WAREHOUSE_LABELS[wh as keyof typeof WAREHOUSE_LABELS] || wh}: ${qty}`
  })
  .join('\n')}

== ACTIVE HIGH-POTENTIAL LEADS ==
${activeLeads.length} leads near conversion:
${activeLeads.map(l => `  ${l.name} (${l.company || 'N/A'}) - ${l.status} - ${l.inquiryType}`).join('\n')}

== KEY METRICS ==
DEF consumption rate (from bucket sales, assuming 20L/bucket): ~${avgDailySales * 20} liters/day
Days of DEF stock remaining: ${avgDailySales > 0 ? Math.round(defStock / (avgDailySales * 20)) : 'N/A'}
Days of urea remaining: ${batchesPossible > 0 ? Math.round((batchesPossible * 1000) / (avgDailySales * 20)) : 0} days of production`

    const advice = await sarvamChat(
      [
        { role: 'system', content: ADVISOR_SYSTEM_PROMPT },
        { role: 'user', content: `Analyze this production data and give recommendations:\n\n${context}` },
      ],
      apiKey,
      { temperature: 0.3, maxTokens: 2048 }
    )

    return NextResponse.json({
      success: true,
      data: {
        advice,
        metrics: {
          ureaStock,
          defStock,
          batchesPossible,
          avgDailySales,
          totalSold30Days: totalSold,
          recentBatches: recentBatches.length,
          activeLeads: activeLeads.length,
        },
      },
    })
  } catch (error) {
    console.error('Production advisor error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate advice'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
