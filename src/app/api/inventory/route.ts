import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { z } from 'zod'
import { BucketType, Warehouse, ActionType } from '@prisma/client'
import { BUCKET_SIZES } from '@/types'

export const dynamic = 'force-dynamic'

// Validation schema for creating inventory transaction
const createInventorySchema = z.object({
  date: z.string().transform(str => new Date(str)),
  warehouse: z.nativeEnum(Warehouse),
  bucketType: z.nativeEnum(BucketType),
  action: z.nativeEnum(ActionType),
  quantity: z.number().positive(),
  buyerSeller: z.string().min(1),
  forceOversell: z.boolean().optional(), // Allow user to confirm overselling
})

// GET - Fetch inventory transactions and summary
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const warehouse = searchParams.get('warehouse') as Warehouse | null
    const bucketType = searchParams.get('bucketType') as BucketType | null

    // Pagination parameters
    const limit = parseInt(searchParams.get('limit') || '200') // Default: 200 transactions
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build filter conditions
    const where: Record<string, unknown> = {}
    if (date) {
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)
      where.date = { gte: startDate, lte: endDate }
    }
    if (warehouse) where.warehouse = warehouse
    if (bucketType) where.bucketType = bucketType

    // Fetch transactions with pagination
    const transactions = await prisma.inventoryTransaction.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      skip: offset,
    })

    // Get total count for pagination
    const totalCount = await prisma.inventoryTransaction.count({ where })

    // Calculate summary - current stock per bucket per warehouse
    const summary = await calculateStockSummary()

    return NextResponse.json({
      success: true,
      transactions,
      summary,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + transactions.length < totalCount,
      },
    })
  } catch (error) {
    console.error('Inventory GET error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch inventory' },
      { status: 500 }
    )
  }
}

// POST - Create new inventory transaction
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = createInventorySchema.parse(body)

    // Check if this is a backdated transaction
    const latestTransaction = await prisma.inventoryTransaction.findFirst({
      where: {
        bucketType: validatedData.bucketType,
        warehouse: validatedData.warehouse
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      select: { date: true },
    })

    const isBackdated = latestTransaction && validatedData.date < latestTransaction.date

    // Get current stock for this bucket+warehouse combination
    const currentStock = isBackdated
      ? await getInventoryStockAtDate(validatedData.bucketType, validatedData.warehouse, validatedData.date)
      : await getCurrentStock(validatedData.bucketType, validatedData.warehouse)

    // Calculate signed quantity and running total
    const signedQuantity = validatedData.action === 'SELL'
      ? -validatedData.quantity
      : validatedData.quantity

    // Check for overselling (selling more than available stock)
    if (validatedData.action === 'SELL' && validatedData.quantity > currentStock) {
      // If user hasn't confirmed, return warning
      if (!validatedData.forceOversell) {
        return NextResponse.json(
          {
            success: false,
            requiresConfirmation: true,
            message: `Warning: Selling ${validatedData.quantity} but only ${currentStock} available in stock. This will result in negative inventory (${currentStock - validatedData.quantity}). Do you want to proceed?`,
            currentStock,
            requestedQuantity: validatedData.quantity,
            shortfall: validatedData.quantity - currentStock,
          },
          { status: 400 }
        )
      }
      // User confirmed, allow overselling
    }

    const newRunningTotal = currentStock + signedQuantity

    // Create transaction
    const transaction = await prisma.inventoryTransaction.create({
      data: {
        date: validatedData.date,
        warehouse: validatedData.warehouse,
        bucketType: validatedData.bucketType,
        action: validatedData.action,
        quantity: signedQuantity,
        buyerSeller: validatedData.buyerSeller,
        runningTotal: newRunningTotal,
      },
    })

    // If backdated, recalculate all subsequent running totals
    if (isBackdated) {
      await recalculateInventoryRunningTotalsAfter(
        validatedData.bucketType,
        validatedData.warehouse,
        validatedData.date,
        currentStock
      )
    }

    // Auto-update stock tracking (only if StockTransaction table exists)
    const bucketSize = BUCKET_SIZES[validatedData.bucketType]
    if (bucketSize > 0) {
      try {
        // Check if StockTransaction table exists by attempting to find one record
        await prisma.stockTransaction.findFirst({ take: 1 })

        if (validatedData.action === 'SELL') {
          // Selling buckets: fill them first (subtract from Free DEF), then sell
          await createStockTransaction({
            date: validatedData.date,
            type: 'SELL_BUCKETS',
            category: 'FREE_DEF',
            quantity: -(validatedData.quantity * bucketSize),
            unit: 'LITERS',
            description: `Sold ${validatedData.quantity}x ${validatedData.bucketType} (${validatedData.quantity * bucketSize}L) to ${validatedData.buyerSeller}`,
          })
        }
        // Note: STOCK action does nothing to Free DEF - buckets are empty containers
      } catch (stockError) {
        // Table doesn't exist yet or other error - silently skip stock tracking
        console.log('Stock tracking not available yet (migration pending)')
      }
    }

    return NextResponse.json({
      success: true,
      transaction,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid data', errors: error.errors },
        { status: 400 }
      )
    }
    console.error('Inventory POST error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create transaction' },
      { status: 500 }
    )
  }
}

// Helper function to get current stock for a bucket+warehouse
async function getCurrentStock(
  bucketType: BucketType,
  warehouse: Warehouse
): Promise<number> {
  const lastTransaction = await prisma.inventoryTransaction.findFirst({
    where: { bucketType, warehouse },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    select: { runningTotal: true },
  })

  return lastTransaction?.runningTotal || 0
}

// Helper function to get stock balance at a specific date (for backdated transactions)
async function getInventoryStockAtDate(
  bucketType: BucketType,
  warehouse: Warehouse,
  beforeDate: Date
): Promise<number> {
  const lastTransaction = await prisma.inventoryTransaction.findFirst({
    where: {
      bucketType,
      warehouse,
      date: { lt: beforeDate }
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    select: { runningTotal: true },
  })

  return lastTransaction?.runningTotal || 0
}

// Helper function to recalculate running totals from a given date onwards
async function recalculateInventoryRunningTotalsAfter(
  bucketType: BucketType,
  warehouse: Warehouse,
  fromDate: Date,
  balanceBeforeDate: number
) {
  const transactions = await prisma.inventoryTransaction.findMany({
    where: {
      bucketType,
      warehouse,
      date: { gte: fromDate }
    },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  })

  if (!transactions || transactions.length === 0) return

  let runningTotal = balanceBeforeDate

  for (const transaction of transactions) {
    runningTotal += transaction.quantity

    await prisma.inventoryTransaction.update({
      where: { id: transaction.id },
      data: { runningTotal }
    })
  }
}

// Helper function to calculate stock summary (optimized with single query)
async function calculateStockSummary() {
  const bucketTypes = Object.values(BucketType)

  // OPTIMIZATION: Fetch all latest running totals in a single query using DISTINCT ON
  // This replaces 26+ separate queries with just 1 query
  const latestStocks = await prisma.$queryRaw<
    Array<{ bucketType: string; warehouse: string; runningTotal: number }>
  >`
    SELECT DISTINCT ON ("bucketType", "warehouse")
      "bucketType",
      "warehouse",
      "runningTotal"
    FROM "InventoryTransaction"
    WHERE "warehouse" IN ('PALLAVI', 'TULARAM')
    ORDER BY "bucketType", "warehouse", "date" DESC, "createdAt" DESC
  `

  // Build a lookup map for O(1) access
  const stockMap = new Map<string, number>()
  for (const stock of latestStocks) {
    const key = `${stock.bucketType}-${stock.warehouse}`
    stockMap.set(key, stock.runningTotal)
  }

  // Get FREE_DEF stock (separate table) - single query
  let freeDEFStock = 0
  try {
    const lastStockTransaction = await prisma.stockTransaction.findFirst({
      where: { category: 'FREE_DEF' },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      select: { runningTotal: true },
    })
    freeDEFStock = lastStockTransaction?.runningTotal || 0
  } catch {
    // Table doesn't exist yet or error
    freeDEFStock = 0
  }

  // Build summary from the fetched data
  const summary = []
  for (const bucketType of bucketTypes) {
    const row: { bucketType: BucketType; pallavi: number; tularam: number; total: number } = {
      bucketType,
      pallavi: 0,
      tularam: 0,
      total: 0,
    }

    // Special handling for FREE_DEF
    if (bucketType === 'FREE_DEF') {
      row.total = freeDEFStock
      summary.push(row)
      continue
    }

    // Lookup stocks from our map
    row.pallavi = stockMap.get(`${bucketType}-PALLAVI`) || 0
    row.tularam = stockMap.get(`${bucketType}-TULARAM`) || 0
    row.total = row.pallavi + row.tularam

    summary.push(row)
  }

  return summary
}

// Helper function to create stock transaction
async function createStockTransaction(data: {
  date: Date
  type: 'FILL_BUCKETS' | 'SELL_BUCKETS'
  category: 'FREE_DEF' | 'FINISHED_GOODS'
  quantity: number
  unit: 'LITERS'
  description: string
}) {
  // Get current stock for this category
  const lastTransaction = await prisma.stockTransaction.findFirst({
    where: { category: data.category },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    select: { runningTotal: true },
  })

  const currentStock = lastTransaction?.runningTotal || 0
  const newRunningTotal = currentStock + data.quantity

  // Create stock transaction
  await prisma.stockTransaction.create({
    data: {
      date: data.date,
      type: data.type,
      category: data.category,
      quantity: data.quantity,
      unit: data.unit,
      description: data.description,
      runningTotal: newRunningTotal,
    },
  })
}
