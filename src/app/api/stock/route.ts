import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { z } from 'zod'
import { StockTransactionType, StockCategory, StockUnit, BagSize, BucketType, Prisma } from '@prisma/client'
import { BUCKET_SIZES, LITERS_PER_BATCH, KG_PER_BAG } from '@/types'

export const dynamic = 'force-dynamic'

// Validation schema for creating stock transaction
const createStockSchema = z.object({
  date: z.string().transform(str => new Date(str)),
  type: z.nativeEnum(StockTransactionType),
  category: z.nativeEnum(StockCategory),
  quantity: z.number().optional(),
  unit: z.nativeEnum(StockUnit).optional(),
  description: z.string().optional(),
  batchCount: z.number().optional(),
  // ADD_UREA: how many bags of each size are being added
  bags45: z.number().int().nonnegative().optional(),
  bags50: z.number().int().nonnegative().optional(),
  // PRODUCE_BATCH: how many kg of each bag type were consumed (partial bags allowed)
  produceKg45: z.number().nonnegative().optional(),
  produceKg50: z.number().nonnegative().optional(),
})

// GET - Fetch stock transactions and summary
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // All authenticated users can view stock

    // Check if table exists first
    try {
      await prisma.stockTransaction.findFirst({ take: 1 })
    } catch (tableError) {
      // Table doesn't exist yet - return empty data
      return NextResponse.json({
        success: true,
        transactions: [],
        summary: {
          ureaKg: 0,
          ureaKg45: 0,
          ureaKg50: 0,
          ureaBags45: 0,
          ureaBags50: 0,
          ureaRemainder45: 0,
          ureaRemainder50: 0,
          ureaCansProduceL: 0,
          freeDEF: 0,
          bucketsInLiters: 0,
          finishedGoods: 0,
        },
        message: 'Database migration pending. Please run: npx prisma migrate deploy'
      })
    }

    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const category = searchParams.get('category') as StockCategory | null

    // Build filter conditions
    const where: Record<string, unknown> = {}
    if (date) {
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)
      where.date = { gte: startDate, lte: endDate }
    }
    if (category) where.category = category

    // Fetch transactions
    const transactions = await prisma.stockTransaction.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    })

    // Calculate summary
    const summary = await calculateStockSummary()

    return NextResponse.json({
      success: true,
      transactions,
      summary,
    })
  } catch (error) {
    console.error('Stock GET error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch stock data' },
      { status: 500 }
    )
  }
}

// POST - Create new stock transaction
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if table exists first
    try {
      await prisma.stockTransaction.findFirst({ take: 1 })
    } catch (tableError) {
      return NextResponse.json({
        success: false,
        message: 'Database migration pending. Please run: npx prisma migrate deploy in your production environment.'
      }, { status: 503 })
    }

    const body = await request.json()
    const validatedData = createStockSchema.parse(body)

    // Permission check based on transaction type
    // ADD_UREA and PRODUCE_BATCH: Only ADMIN and EXPENSE_INVENTORY
    // SELL_FREE_DEF: All authenticated users
    // FILL_BUCKETS and SELL_BUCKETS: Auto-triggered (all users)
    if (validatedData.type === 'ADD_UREA' || validatedData.type === 'PRODUCE_BATCH') {
      if (session.role !== 'ADMIN' && session.role !== 'EXPENSE_INVENTORY') {
        return NextResponse.json(
          { success: false, message: 'Access denied. Only admins and expense managers can perform this action.' },
          { status: 403 }
        )
      }
    }

    // Handle different transaction types
    if (validatedData.type === 'PRODUCE_BATCH') {
      return await handleProduceBatch(validatedData)
    } else if (validatedData.type === 'FILL_BUCKETS') {
      return await handleFillBuckets(validatedData)
    } else if (validatedData.type === 'SELL_BUCKETS') {
      return await handleSellBuckets(validatedData)
    } else {
      // Handle regular transactions (ADD_UREA, SELL_FREE_DEF)
      return await handleRegularTransaction(validatedData)
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid data', errors: error.errors },
        { status: 400 }
      )
    }
    console.error('Stock POST error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create transaction' },
      { status: 500 }
    )
  }
}

// Handle production batch (Urea → Free DEF)
async function handleProduceBatch(data: z.infer<typeof createStockSchema>) {
  const batchCount = data.batchCount || 1
  const kg45 = data.produceKg45 || 0
  const kg50 = data.produceKg50 || 0

  if (kg45 === 0 && kg50 === 0) {
    return NextResponse.json(
      { success: false, message: 'Specify the Urea kg used (from 45kg-type and/or 50kg-type) for production' },
      { status: 400 }
    )
  }

  if (kg45 < 0 || kg50 < 0) {
    return NextResponse.json(
      { success: false, message: 'Urea used cannot be negative' },
      { status: 400 }
    )
  }

  const ureaFrom45 = kg45
  const ureaFrom50 = kg50
  const totalUreaConsumed = ureaFrom45 + ureaFrom50
  const totalLitersProduced = LITERS_PER_BATCH * batchCount

  // Check if this is backdated for UREA
  const latestUreaTransaction = await prisma.stockTransaction.findFirst({
    where: { category: StockCategory.UREA },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    select: { date: true },
  })
  const isUreaBackdated = latestUreaTransaction && data.date < latestUreaTransaction.date

  // Check if this is backdated for FREE_DEF
  const latestFreeDEFTransaction = await prisma.stockTransaction.findFirst({
    where: { category: StockCategory.FREE_DEF },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    select: { date: true },
  })
  const isFreeDEFBackdated = latestFreeDEFTransaction && data.date < latestFreeDEFTransaction.date

  // Per-size stock check (must have ≥ requested kg of each bag type)
  const onHand = await getUreaKgOnHandAt(isUreaBackdated ? data.date : null)
  if (kg45 > onHand.kg45 || kg50 > onHand.kg50) {
    return NextResponse.json(
      {
        success: false,
        message: `Insufficient Urea. Have ${onHand.kg45}kg of 45kg-type + ${onHand.kg50}kg of 50kg-type; need ${kg45}kg + ${kg50}kg`,
        currentStock: onHand,
      },
      { status: 400 }
    )
  }

  // Use correct baseline stock for UREA (in kg)
  const ureaStock = isUreaBackdated
    ? await getStockAtDate(StockCategory.UREA, data.date)
    : await getCurrentStock(StockCategory.UREA)

  // Use correct baseline stock for FREE_DEF
  const freeDEFStock = isFreeDEFBackdated
    ? await getStockAtDate(StockCategory.FREE_DEF, data.date)
    : await getCurrentStock(StockCategory.FREE_DEF)
  const freeDEFRunningTotal = freeDEFStock + totalLitersProduced

  // Build UREA debit rows (one per non-zero bag type). Sequential running totals.
  const batchLabel = `${batchCount} batch${batchCount !== 1 ? 'es' : ''}`
  let ureaRunningTotal = ureaStock
  const writes: Prisma.PrismaPromise<unknown>[] = []

  if (kg45 > 0) {
    ureaRunningTotal -= ureaFrom45
    writes.push(
      prisma.stockTransaction.create({
        data: {
          date: data.date,
          type: 'PRODUCE_BATCH',
          category: 'UREA',
          quantity: -ureaFrom45,
          unit: 'KG',
          bagSize: 'KG_45',
          description: `Production: ${batchLabel} (-${ureaFrom45}kg from 45kg-type Urea)`,
          runningTotal: ureaRunningTotal,
        },
      })
    )
  }

  if (kg50 > 0) {
    ureaRunningTotal -= ureaFrom50
    writes.push(
      prisma.stockTransaction.create({
        data: {
          date: data.date,
          type: 'PRODUCE_BATCH',
          category: 'UREA',
          quantity: -ureaFrom50,
          unit: 'KG',
          bagSize: 'KG_50',
          description: `Production: ${batchLabel} (-${ureaFrom50}kg from 50kg-type Urea)`,
          runningTotal: ureaRunningTotal,
        },
      })
    )
  }

  writes.push(
    prisma.stockTransaction.create({
      data: {
        date: data.date,
        type: 'PRODUCE_BATCH',
        category: 'FREE_DEF',
        quantity: totalLitersProduced,
        unit: 'LITERS',
        description: `Production: ${batchLabel} (+${totalLitersProduced}L Free DEF)`,
        runningTotal: freeDEFRunningTotal,
      },
    })
  )

  const transactions = await prisma.$transaction(writes)

  // If backdated, recalculate all subsequent running totals for affected categories
  if (isUreaBackdated) {
    await recalculateRunningTotalsAfter(StockCategory.UREA, data.date, ureaStock)
  }
  if (isFreeDEFBackdated) {
    await recalculateRunningTotalsAfter(StockCategory.FREE_DEF, data.date, freeDEFStock)
  }

  return NextResponse.json({
    success: true,
    message: `Produced ${totalLitersProduced}L Free DEF (${batchLabel}) using ${totalUreaConsumed}kg Urea (${ureaFrom45}kg 45kg-type + ${ureaFrom50}kg 50kg-type)`,
    transactions,
  })
}

// Handle filling buckets (auto-called from inventory)
async function handleFillBuckets(data: z.infer<typeof createStockSchema>) {
  if (data.quantity === undefined) {
    return NextResponse.json(
      { success: false, message: 'quantity is required for FILL_BUCKETS' },
      { status: 400 }
    )
  }

  // Check if this is backdated
  const latestTransaction = await prisma.stockTransaction.findFirst({
    where: { category: StockCategory.FREE_DEF },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    select: { date: true },
  })
  const isBackdated = latestTransaction && data.date < latestTransaction.date

  // Use correct baseline stock
  const freeDEFStock = isBackdated
    ? await getStockAtDate(StockCategory.FREE_DEF, data.date)
    : await getCurrentStock(StockCategory.FREE_DEF)

  const litersNeeded = Math.abs(data.quantity)

  // Check if enough Free DEF is available
  if (freeDEFStock < litersNeeded) {
    return NextResponse.json(
      {
        success: false,
        message: `Insufficient Free DEF. Need ${litersNeeded}L, have ${freeDEFStock}L`,
        currentStock: freeDEFStock,
      },
      { status: 400 }
    )
  }

  // Subtract from Free DEF only (Finished Goods stays same)
  const newRunningTotal = freeDEFStock - litersNeeded

  const transaction = await prisma.stockTransaction.create({
    data: {
      date: data.date,
      type: 'FILL_BUCKETS',
      category: 'FREE_DEF',
      quantity: -litersNeeded,
      unit: 'LITERS',
      description: data.description || `Filled buckets: -${litersNeeded}L`,
      runningTotal: newRunningTotal,
    },
  })

  // If backdated, recalculate all subsequent running totals
  if (isBackdated) {
    await recalculateRunningTotalsAfter(StockCategory.FREE_DEF, data.date, freeDEFStock)
  }

  return NextResponse.json({
    success: true,
    transaction,
  })
}

// Handle selling buckets (auto-called from inventory)
async function handleSellBuckets(data: z.infer<typeof createStockSchema>) {
  if (data.quantity === undefined) {
    return NextResponse.json(
      { success: false, message: 'quantity is required for SELL_BUCKETS' },
      { status: 400 }
    )
  }

  // Check if this is backdated
  const latestTransaction = await prisma.stockTransaction.findFirst({
    where: { category: StockCategory.FREE_DEF },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    select: { date: true },
  })
  const isBackdated = latestTransaction && data.date < latestTransaction.date

  // Use correct baseline stock
  const freeDEFStock = isBackdated
    ? await getStockAtDate(StockCategory.FREE_DEF, data.date)
    : await getCurrentStock(StockCategory.FREE_DEF)

  const litersToSubtract = Math.abs(data.quantity)

  // Check if enough Free DEF is available
  if (freeDEFStock < litersToSubtract) {
    return NextResponse.json(
      {
        success: false,
        message: `Insufficient Free DEF to fill buckets. Need ${litersToSubtract}L, have ${freeDEFStock}L`,
        currentStock: freeDEFStock,
      },
      { status: 400 }
    )
  }

  const newRunningTotal = freeDEFStock - litersToSubtract

  const transaction = await prisma.stockTransaction.create({
    data: {
      date: data.date,
      type: 'SELL_BUCKETS',
      category: 'FREE_DEF',
      quantity: -litersToSubtract,
      unit: 'LITERS',
      description: data.description || `Sold buckets: -${litersToSubtract}L`,
      runningTotal: newRunningTotal,
    },
  })

  // If backdated, recalculate all subsequent running totals
  if (isBackdated) {
    await recalculateRunningTotalsAfter(StockCategory.FREE_DEF, data.date, freeDEFStock)
  }

  return NextResponse.json({
    success: true,
    transaction,
  })
}

// Handle regular transactions (ADD_UREA, SELL_FREE_DEF)
async function handleRegularTransaction(data: z.infer<typeof createStockSchema>) {
  // Check if this is a backdated transaction
  const latestTransaction = await prisma.stockTransaction.findFirst({
    where: { category: data.category },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    select: { date: true },
  })

  const isBackdated = latestTransaction && data.date < latestTransaction.date

  // Use correct baseline stock
  const currentStock = isBackdated
    ? await getStockAtDate(data.category, data.date)
    : await getCurrentStock(data.category)

  // ADD_UREA: split into per-size rows based on bags45 / bags50 inputs
  if (data.type === 'ADD_UREA') {
    const bags45 = data.bags45 || 0
    const bags50 = data.bags50 || 0

    if (bags45 === 0 && bags50 === 0) {
      return NextResponse.json(
        { success: false, message: 'Enter at least one bag (45kg or 50kg)' },
        { status: 400 }
      )
    }

    const kg45 = bags45 * KG_PER_BAG.KG_45
    const kg50 = bags50 * KG_PER_BAG.KG_50

    let runningTotal = currentStock
    const writes: Prisma.PrismaPromise<unknown>[] = []

    if (bags45 > 0) {
      runningTotal += kg45
      writes.push(
        prisma.stockTransaction.create({
          data: {
            date: data.date,
            type: 'ADD_UREA',
            category: 'UREA',
            quantity: kg45,
            unit: 'KG',
            bagSize: 'KG_45',
            description: data.description
              ? `${data.description} (${bags45} × 45kg)`
              : `Added ${bags45} × 45kg bags (${kg45}kg)`,
            runningTotal,
          },
        })
      )
    }

    if (bags50 > 0) {
      runningTotal += kg50
      writes.push(
        prisma.stockTransaction.create({
          data: {
            date: data.date,
            type: 'ADD_UREA',
            category: 'UREA',
            quantity: kg50,
            unit: 'KG',
            bagSize: 'KG_50',
            description: data.description
              ? `${data.description} (${bags50} × 50kg)`
              : `Added ${bags50} × 50kg bags (${kg50}kg)`,
            runningTotal,
          },
        })
      )
    }

    const transactions = await prisma.$transaction(writes)

    if (isBackdated) {
      await recalculateRunningTotalsAfter(StockCategory.UREA, data.date, currentStock)
    }

    return NextResponse.json({
      success: true,
      transactions,
      message: `Added ${kg45 + kg50}kg Urea (${bags45} × 45kg + ${bags50} × 50kg)`,
    })
  }

  // Beyond ADD_UREA, the regular path requires quantity + unit
  if (data.quantity === undefined || data.unit === undefined) {
    return NextResponse.json(
      { success: false, message: 'quantity and unit are required for this transaction type' },
      { status: 400 }
    )
  }

  // For selling Free DEF, check if enough stock is available
  if (data.type === 'SELL_FREE_DEF' && data.quantity < 0) {
    const quantityToSell = Math.abs(data.quantity)
    if (currentStock < quantityToSell) {
      return NextResponse.json(
        {
          success: false,
          message: `Insufficient Free DEF. Trying to sell ${quantityToSell}L, have ${currentStock}L`,
          currentStock,
        },
        { status: 400 }
      )
    }
  }

  const newRunningTotal = currentStock + data.quantity

  // For SELL_FREE_DEF, also create InventoryTransaction
  // Note: Finished Goods = Free DEF, so we don't create separate FINISHED_GOODS transaction
  if (data.type === 'SELL_FREE_DEF') {
    const transactions = await prisma.$transaction([
      // StockTransaction for FREE_DEF
      prisma.stockTransaction.create({
        data: {
          date: data.date,
          type: data.type,
          category: data.category,
          quantity: data.quantity,
          unit: data.unit,
          description: data.description,
          runningTotal: newRunningTotal,
        },
      }),
      // InventoryTransaction for display in Inventory page
      // Running total should match the Free DEF stock balance (same as StockBoard)
      prisma.inventoryTransaction.create({
        data: {
          date: data.date,
          warehouse: 'FACTORY',
          bucketType: 'FREE_DEF',
          action: 'SELL',
          quantity: data.quantity, // Store as negative for sell
          buyerSeller: data.description?.split(' to ').pop()?.trim() || 'Customer',
          runningTotal: newRunningTotal, // Use Free DEF stock balance
        },
      }),
    ])

    // If backdated, recalculate all subsequent running totals
    if (isBackdated) {
      await recalculateRunningTotalsAfter(data.category, data.date, currentStock)
    }

    return NextResponse.json({
      success: true,
      transactions,
    })
  }

  // Other regular transactions
  const transaction = await prisma.stockTransaction.create({
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

  // If backdated, recalculate all subsequent running totals
  if (isBackdated) {
    await recalculateRunningTotalsAfter(data.category, data.date, currentStock)
  }

  return NextResponse.json({
    success: true,
    transaction,
  })
}

// Helper function to get current stock for a category
async function getCurrentStock(category: StockCategory): Promise<number> {
  const lastTransaction = await prisma.stockTransaction.findFirst({
    where: { category },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    select: { runningTotal: true },
  })

  return lastTransaction?.runningTotal || 0
}

// Helper function to get stock balance at a specific date (for backdated transactions)
async function getStockAtDate(category: StockCategory, beforeDate: Date): Promise<number> {
  const lastTransaction = await prisma.stockTransaction.findFirst({
    where: {
      category,
      date: { lt: beforeDate }
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    select: { runningTotal: true },
  })

  return lastTransaction?.runningTotal || 0
}

// Helper function to recalculate running totals from a given date onwards
async function recalculateRunningTotalsAfter(
  category: StockCategory,
  fromDate: Date,
  balanceBeforeDate: number
) {
  const transactions = await prisma.stockTransaction.findMany({
    where: {
      category,
      date: { gte: fromDate }
    },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  })

  if (!transactions || transactions.length === 0) return

  let runningTotal = balanceBeforeDate

  for (const transaction of transactions) {
    runningTotal += transaction.quantity

    await prisma.stockTransaction.update({
      where: { id: transaction.id },
      data: { runningTotal }
    })
  }
}

// Aggregate raw UREA kg on hand per bag type. If `beforeDate` is provided,
// returns the on-hand kg as of that date (exclusive); otherwise returns current.
async function getUreaKgOnHandAt(beforeDate: Date | null): Promise<{ kg45: number; kg50: number }> {
  const where: Prisma.StockTransactionWhereInput = { category: StockCategory.UREA }
  if (beforeDate) where.date = { lt: beforeDate }

  const grouped = await prisma.stockTransaction.groupBy({
    by: ['bagSize'],
    where,
    _sum: { quantity: true },
  })

  let kg45 = 0
  let kg50 = 0
  for (const row of grouped) {
    const sum = row._sum.quantity ?? 0
    if (row.bagSize === BagSize.KG_45) kg45 = sum
    else if (row.bagSize === BagSize.KG_50) kg50 = sum
    else kg45 += sum // legacy rows with null bagSize fall under 45kg
  }

  return { kg45, kg50 }
}

// Helper function to calculate stock summary
async function calculateStockSummary() {
  const ureaKg = await getCurrentStock(StockCategory.UREA)
  const freeDEF = await getCurrentStock(StockCategory.FREE_DEF)
  const { kg45, kg50 } = await getUreaKgOnHandAt(null)

  // Full bags = floor; the leftover kg stays in the currently-open bag and is
  // carried forward to the next production (it's never rounded away).
  const bags45 = Math.floor(kg45 / KG_PER_BAG.KG_45)
  const bags50 = Math.floor(kg50 / KG_PER_BAG.KG_50)
  // Round to 2 decimals to avoid float artifacts (e.g. 40.0000001kg open)
  const remainder45 = Math.round((kg45 - bags45 * KG_PER_BAG.KG_45) * 100) / 100
  const remainder50 = Math.round((kg50 - bags50 * KG_PER_BAG.KG_50) * 100) / 100

  // Calculate buckets in liters from inventory (for display purposes - they're empty)
  const bucketsInLiters = await calculateBucketsInLiters()

  // Finished Goods = Free DEF only (buckets are empty containers)
  const finishedGoods = freeDEF

  return {
    ureaKg,
    ureaKg45: kg45,
    ureaKg50: kg50,
    ureaBags45: bags45,
    ureaBags50: bags50,
    ureaRemainder45: remainder45,
    ureaRemainder50: remainder50,
    ureaCansProduceL: Math.floor(ureaKg / 360) * 1000,
    freeDEF,
    bucketsInLiters,
    finishedGoods,
  }
}

// Calculate total liters in buckets from inventory
async function calculateBucketsInLiters(): Promise<number> {
  const bucketTypes = Object.values(BucketType)
  let totalLiters = 0

  for (const bucketType of bucketTypes) {
    const bucketSize = BUCKET_SIZES[bucketType]
    if (bucketSize === 0) continue // Skip IBC_TANK

    // Get latest running total for each warehouse
    const pallavi = await prisma.inventoryTransaction.findFirst({
      where: { bucketType, warehouse: 'PALLAVI' },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      select: { runningTotal: true },
    })

    const tularam = await prisma.inventoryTransaction.findFirst({
      where: { bucketType, warehouse: 'TULARAM' },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      select: { runningTotal: true },
    })

    const pallaviStock = pallavi?.runningTotal || 0
    const tularamStock = tularam?.runningTotal || 0
    const totalBuckets = pallaviStock + tularamStock

    totalLiters += totalBuckets * bucketSize
  }

  return totalLiters
}
