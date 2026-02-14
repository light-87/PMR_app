import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSarvamApiKey, sarvamChat } from '@/lib/sarvam'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, subDays, subMonths, format } from 'date-fns'
import {
  BUCKET_TYPE_LABELS,
  WAREHOUSE_LABELS,
  ACCOUNT_LABELS,
  LEAD_STATUS_LABELS,
} from '@/types'

export const dynamic = 'force-dynamic'

const CLASSIFICATION_PROMPT = `You are a query classifier for PMR Industries (DEF manufacturing company).

Classify the user's question into ONE of these categories and extract parameters:
- EXPENSE_SUMMARY: Questions about income, expenses, profit, payments
- INVENTORY_STOCK: Questions about current stock levels, how many buckets
- INVENTORY_SALES: Questions about sales, what was sold, to whom
- STOCK_STATUS: Questions about urea stock, DEF stock, raw materials, production capacity
- LEAD_PIPELINE: Questions about leads, sales pipeline, contacts
- CUSTOMER_STATEMENT: Questions about a specific customer/vendor's transactions
- PRODUCTION_STATS: Questions about production batches, how much was produced
- GENERAL: Broad questions that need multiple data sources

Return ONLY JSON (no markdown):
{
  "queryType": "<one of the above>",
  "dateRange": "today" | "yesterday" | "this_week" | "last_week" | "this_month" | "last_month" | "last_3_months" | "all",
  "customerName": "<name if asking about specific person>" | null,
  "bucketType": "<bucket type if specific>" | null,
  "warehouse": "<warehouse if specific>" | null
}`

function getDateRange(range: string): { start: Date; end: Date } {
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)

  switch (range) {
    case 'today':
      return { start: todayStart, end: todayEnd }
    case 'yesterday':
      return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) }
    case 'this_week':
      return { start: startOfDay(subDays(now, now.getDay())), end: todayEnd }
    case 'last_week':
      return { start: startOfDay(subDays(now, now.getDay() + 7)), end: endOfDay(subDays(now, now.getDay() + 1)) }
    case 'this_month':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: todayEnd }
    case 'last_month':
      return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0) }
    case 'last_3_months':
      return { start: startOfDay(subMonths(now, 3)), end: todayEnd }
    case 'all':
    default:
      return { start: new Date(2020, 0, 1), end: todayEnd }
  }
}

async function fetchDataForQuery(
  queryType: string,
  dateRange: string,
  customerName: string | null,
  bucketType: string | null,
  warehouse: string | null
): Promise<string> {
  const { start, end } = getDateRange(dateRange)
  const dateFilter = { gte: start, lte: end }

  switch (queryType) {
    case 'EXPENSE_SUMMARY': {
      const expenses = await prisma.expenseTransaction.findMany({
        where: { date: dateFilter },
        orderBy: { date: 'desc' },
      })
      const totalIncome = expenses.filter(e => e.type === 'INCOME').reduce((s, e) => s + Number(e.amount), 0)
      const totalExpense = expenses.filter(e => e.type === 'EXPENSE').reduce((s, e) => s + Number(e.amount), 0)
      const byAccount = expenses.reduce((acc, e) => {
        const key = `${e.account}-${e.type}`
        acc[key] = (acc[key] || 0) + Number(e.amount)
        return acc
      }, {} as Record<string, number>)
      return `Period: ${format(start, 'dd/MM/yyyy')} to ${format(end, 'dd/MM/yyyy')}
Total Income: ₹${totalIncome.toLocaleString('en-IN')}
Total Expense: ₹${totalExpense.toLocaleString('en-IN')}
Net Profit: ₹${(totalIncome - totalExpense).toLocaleString('en-IN')}
Total Transactions: ${expenses.length}
By Account: ${JSON.stringify(byAccount)}
Top 5 transactions: ${JSON.stringify(expenses.slice(0, 5).map(e => ({ date: format(e.date, 'dd/MM'), type: e.type, amount: Number(e.amount), name: e.name, account: e.account })))}`
    }

    case 'INVENTORY_STOCK': {
      const where: Record<string, unknown> = {}
      if (bucketType) where.bucketType = bucketType
      if (warehouse) where.warehouse = warehouse

      const transactions = await prisma.inventoryTransaction.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: 500,
      })

      // Calculate current stock from latest transaction per type/warehouse
      const stockMap: Record<string, number> = {}
      const seen = new Set<string>()
      for (const t of transactions) {
        const key = `${t.bucketType}-${t.warehouse}`
        if (!seen.has(key)) {
          seen.add(key)
          stockMap[key] = t.runningTotal
        }
      }

      return `Current Stock Levels (latest running totals):
${Object.entries(stockMap).map(([key, total]) => {
  const [bt, wh] = key.split('-')
  return `${BUCKET_TYPE_LABELS[bt as keyof typeof BUCKET_TYPE_LABELS] || bt} at ${WAREHOUSE_LABELS[wh as keyof typeof WAREHOUSE_LABELS] || wh}: ${total}`
}).join('\n')}`
    }

    case 'INVENTORY_SALES': {
      const where: Record<string, unknown> = { action: 'SELL', date: dateFilter }
      if (bucketType) where.bucketType = bucketType
      if (warehouse) where.warehouse = warehouse

      const sales = await prisma.inventoryTransaction.findMany({
        where,
        orderBy: { date: 'desc' },
      })

      const totalSold = sales.reduce((s, t) => s + t.quantity, 0)
      const byType = sales.reduce((acc, t) => {
        acc[t.bucketType] = (acc[t.bucketType] || 0) + t.quantity
        return acc
      }, {} as Record<string, number>)
      const byBuyer = sales.reduce((acc, t) => {
        if (t.buyerSeller) acc[t.buyerSeller] = (acc[t.buyerSeller] || 0) + t.quantity
        return acc
      }, {} as Record<string, number>)

      return `Sales for ${format(start, 'dd/MM/yyyy')} to ${format(end, 'dd/MM/yyyy')}:
Total Buckets Sold: ${totalSold}
By Bucket Type: ${Object.entries(byType).map(([k, v]) => `${BUCKET_TYPE_LABELS[k as keyof typeof BUCKET_TYPE_LABELS] || k}: ${v}`).join(', ')}
Top Buyers: ${Object.entries(byBuyer).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k}: ${v}`).join(', ')}`
    }

    case 'STOCK_STATUS': {
      const transactions = await prisma.stockTransaction.findMany({
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: 100,
      })

      const latestByCategory: Record<string, number> = {}
      const seenCat = new Set<string>()
      for (const t of transactions) {
        if (!seenCat.has(t.category)) {
          seenCat.add(t.category)
          latestByCategory[t.category] = t.runningTotal
        }
      }

      const recentBatches = transactions.filter(t => t.type === 'PRODUCE_BATCH').slice(0, 5)

      return `Current Raw Material & Production Status:
Urea Stock: ${latestByCategory['UREA'] || 0} kg
Free DEF Stock: ${latestByCategory['FREE_DEF'] || 0} liters
Finished Goods: ${latestByCategory['FINISHED_GOODS'] || 0}
Note: 360kg urea = 1 batch = 1000L DEF, 1 bag = 45kg, 8 bags per batch
Recent production batches: ${recentBatches.map(b => `${format(b.date, 'dd/MM')}: ${b.quantity} ${b.unit}`).join(', ')}`
    }

    case 'LEAD_PIPELINE': {
      const leads = await prisma.lead.findMany()
      const byStatus = leads.reduce((acc, l) => {
        acc[l.status] = (acc[l.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const todayLeads = leads.filter(l => {
        if (!l.nextActionDate) return false
        const d = new Date(l.nextActionDate)
        return d >= startOfDay(new Date()) && d <= endOfDay(new Date())
      })

      return `Lead Pipeline:
${Object.entries(byStatus).map(([k, v]) => `${LEAD_STATUS_LABELS[k as keyof typeof LEAD_STATUS_LABELS] || k}: ${v}`).join('\n')}
Total Leads: ${leads.length}
Today's Follow-ups: ${todayLeads.length}
${todayLeads.length > 0 ? `Names: ${todayLeads.map(l => `${l.name} (${l.nextActionType})`).join(', ')}` : ''}`
    }

    case 'CUSTOMER_STATEMENT': {
      if (!customerName) return 'No customer name specified.'
      const expenses = await prisma.expenseTransaction.findMany({
        where: { name: { contains: customerName, mode: 'insensitive' } },
        orderBy: { date: 'desc' },
        take: 20,
      })
      const inventory = await prisma.inventoryTransaction.findMany({
        where: { buyerSeller: { contains: customerName, mode: 'insensitive' } },
        orderBy: { date: 'desc' },
        take: 20,
      })

      const totalIncome = expenses.filter(e => e.type === 'INCOME').reduce((s, e) => s + Number(e.amount), 0)
      const totalExpense = expenses.filter(e => e.type === 'EXPENSE').reduce((s, e) => s + Number(e.amount), 0)

      return `Statement for "${customerName}":
Expense Transactions: ${expenses.length}
Total Income from them: ₹${totalIncome.toLocaleString('en-IN')}
Total Expense to them: ₹${totalExpense.toLocaleString('en-IN')}
Net: ₹${(totalIncome - totalExpense).toLocaleString('en-IN')}
Inventory Transactions: ${inventory.length} (${inventory.reduce((s, t) => s + t.quantity, 0)} buckets total)
Recent expenses: ${JSON.stringify(expenses.slice(0, 5).map(e => ({ date: format(e.date, 'dd/MM'), type: e.type, amount: Number(e.amount) })))}
Recent inventory: ${JSON.stringify(inventory.slice(0, 5).map(t => ({ date: format(t.date, 'dd/MM'), type: t.action, bucket: t.bucketType, qty: t.quantity })))}`
    }

    case 'PRODUCTION_STATS': {
      const batches = await prisma.stockTransaction.findMany({
        where: { type: 'PRODUCE_BATCH', date: dateFilter },
        orderBy: { date: 'desc' },
      })
      const ureaAdded = await prisma.stockTransaction.findMany({
        where: { type: 'ADD_UREA', date: dateFilter },
        orderBy: { date: 'desc' },
      })

      const totalProduced = batches.reduce((s, b) => s + b.quantity, 0)
      const totalUrea = ureaAdded.reduce((s, u) => s + u.quantity, 0)

      return `Production Stats for ${format(start, 'dd/MM/yyyy')} to ${format(end, 'dd/MM/yyyy')}:
Batches Produced: ${batches.length}
Total DEF Produced: ${totalProduced} liters
Urea Added: ${totalUrea} kg (${Math.round(totalUrea / 45)} bags)
Batch Details: ${batches.map(b => `${format(b.date, 'dd/MM')}: ${b.quantity}L`).join(', ')}`
    }

    case 'GENERAL':
    default: {
      // Fetch a broad summary
      const [expCount, invCount, stockCount, leadCount] = await Promise.all([
        prisma.expenseTransaction.count({ where: { date: dateFilter } }),
        prisma.inventoryTransaction.count({ where: { date: dateFilter } }),
        prisma.stockTransaction.count({ where: { date: dateFilter } }),
        prisma.lead.count(),
      ])

      const expenses = await prisma.expenseTransaction.findMany({
        where: { date: dateFilter },
      })
      const totalIncome = expenses.filter(e => e.type === 'INCOME').reduce((s, e) => s + Number(e.amount), 0)
      const totalExpense = expenses.filter(e => e.type === 'EXPENSE').reduce((s, e) => s + Number(e.amount), 0)

      const invTx = await prisma.inventoryTransaction.findMany({
        where: { date: dateFilter },
      })
      const totalStocked = invTx.filter(t => t.action === 'STOCK').reduce((s, t) => s + t.quantity, 0)
      const totalSold = invTx.filter(t => t.action === 'SELL').reduce((s, t) => s + t.quantity, 0)

      return `General Summary for ${format(start, 'dd/MM/yyyy')} to ${format(end, 'dd/MM/yyyy')}:
Expense Transactions: ${expCount}, Income: ₹${totalIncome.toLocaleString('en-IN')}, Expense: ₹${totalExpense.toLocaleString('en-IN')}, Net: ₹${(totalIncome - totalExpense).toLocaleString('en-IN')}
Inventory Transactions: ${invCount}, Stocked: ${totalStocked}, Sold: ${totalSold}
Stock Transactions: ${stockCount}
Total Leads: ${leadCount}`
    }
  }
}

const ANSWER_SYSTEM_PROMPT = `You are PMR Industries' business assistant. PMR Industries manufactures DEF (Diesel Exhaust Fluid).

Answer the user's question based on the provided business data. Rules:
- Reply in the SAME LANGUAGE the user asked in (Marathi, Hindi, or English)
- Be concise and specific with numbers
- Format amounts in Indian style (₹1,00,000)
- If data seems incomplete, mention that
- Don't make up data — only use what's provided
- Use bullet points for lists`

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

    const { message } = await request.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ success: false, error: 'No message provided' }, { status: 400 })
    }

    // Step 1: Classify the query
    const classificationResponse = await sarvamChat(
      [
        { role: 'system', content: CLASSIFICATION_PROMPT },
        { role: 'user', content: message },
      ],
      apiKey,
      { temperature: 0.1 }
    )

    let classification
    try {
      const jsonMatch = classificationResponse.match(/\{[\s\S]*\}/)
      classification = jsonMatch ? JSON.parse(jsonMatch[0]) : { queryType: 'GENERAL', dateRange: 'this_month' }
    } catch {
      classification = { queryType: 'GENERAL', dateRange: 'this_month' }
    }

    // Step 2: Fetch relevant data
    const data = await fetchDataForQuery(
      classification.queryType,
      classification.dateRange || 'this_month',
      classification.customerName,
      classification.bucketType,
      classification.warehouse
    )

    // Step 3: Generate answer
    const answer = await sarvamChat(
      [
        { role: 'system', content: ANSWER_SYSTEM_PROMPT },
        { role: 'user', content: `Question: ${message}\n\nBusiness Data:\n${data}` },
      ],
      apiKey,
      { temperature: 0.3, maxTokens: 1024 }
    )

    return NextResponse.json({
      success: true,
      data: {
        answer,
        queryType: classification.queryType,
        dateRange: classification.dateRange,
      },
    })
  } catch (error) {
    console.error('Chat error:', error)
    const message = error instanceof Error ? error.message : 'Failed to process question'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
