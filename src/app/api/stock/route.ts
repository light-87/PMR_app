import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { z } from 'zod'
import { StockTransactionType, StockCategory, StockUnit, BucketType } from '@prisma/client'
import { BUCKET_SIZES, UREA_PER_BATCH_KG, LITERS_PER_BATCH } from '@/types'

export const dynamic = 'force-dynamic'

// Validation schema for creating stock transaction
const createStockSchema = z.object({
  date: z.string().transform(str => new Date(str)),
  type: z.nativeEnum(StockTransactionType),
  category: z.nativeEnum(StockCategory),
  quantity: z.number(),
  unit: z.nativeEnum(StockUnit),
  description: z.string().optional(),
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

    // Only admins can view stock
    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      )
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

    // Only admins can modify stock
    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createStockSchema.parse(body)

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
  // Check if enough Urea is available
  const ureaStock = await getCurrentStock(StockCategory.UREA)
  if (ureaStock < UREA_PER_BATCH_KG) {
    return NextResponse.json(
      {
        success: false,
        message: `Insufficient Urea. Need ${UREA_PER_BATCH_KG}kg, have ${ureaStock}kg`,
        currentStock: ureaStock,
      },
      { status: 400 }
    )
  }

  // Create two transactions: subtract Urea, add Free DEF
  const ureaRunningTotal = ureaStock - UREA_PER_BATCH_KG
  const freeDEFStock = await getCurrentStock(StockCategory.FREE_DEF)
  const freeDEFRunningTotal = freeDEFStock + LITERS_PER_BATCH
  const finishedGoodsStock = await getCurrentStock(StockCategory.FINISHED_GOODS)
  const finishedGoodsRunningTotal = finishedGoodsStock + LITERS_PER_BATCH

  // Create transactions in a transaction block
  const transactions = await prisma.$transaction([
    prisma.stockTransaction.create({
      data: {
        date: data.date,
        type: 'PRODUCE_BATCH',
        category: 'UREA',
        quantity: -UREA_PER_BATCH_KG,
        unit: 'KG',
        description: `Production batch: -${UREA_PER_BATCH_KG}kg Urea`,
        runningTotal: ureaRunningTotal,
      },
    }),
    prisma.stockTransaction.create({
      data: {
        date: data.date,
        type: 'PRODUCE_BATCH',
        category: 'FREE_DEF',
        quantity: LITERS_PER_BATCH,
        unit: 'LITERS',
        description: `Production batch: +${LITERS_PER_BATCH}L Free DEF`,
        runningTotal: freeDEFRunningTotal,
      },
    }),
    prisma.stockTransaction.create({
      data: {
        date: data.date,
        type: 'PRODUCE_BATCH',
        category: 'FINISHED_GOODS',
        quantity: LITERS_PER_BATCH,
        unit: 'LITERS',
        description: `Production batch: +${LITERS_PER_BATCH}L Finished Goods`,
        runningTotal: finishedGoodsRunningTotal,
      },
    }),
  ])

  return NextResponse.json({
    success: true,
    message: `Produced ${LITERS_PER_BATCH}L Free DEF using ${UREA_PER_BATCH_KG}kg Urea`,
    transactions,
  })
}

// Handle filling buckets (auto-called from inventory)
async function handleFillBuckets(data: z.infer<typeof createStockSchema>) {
  const freeDEFStock = await getCurrentStock(StockCategory.FREE_DEF)
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

  return NextResponse.json({
    success: true,
    transaction,
  })
}

// Handle selling buckets (auto-called from inventory)
async function handleSellBuckets(data: z.infer<typeof createStockSchema>) {
  const finishedGoodsStock = await getCurrentStock(StockCategory.FINISHED_GOODS)
  const litersToSubtract = Math.abs(data.quantity)

  const newRunningTotal = finishedGoodsStock - litersToSubtract

  const transaction = await prisma.stockTransaction.create({
    data: {
      date: data.date,
      type: 'SELL_BUCKETS',
      category: 'FINISHED_GOODS',
      quantity: -litersToSubtract,
      unit: 'LITERS',
      description: data.description || `Sold buckets: -${litersToSubtract}L`,
      runningTotal: newRunningTotal,
    },
  })

  return NextResponse.json({
    success: true,
    transaction,
  })
}

// Handle regular transactions (ADD_UREA, SELL_FREE_DEF)
async function handleRegularTransaction(data: z.infer<typeof createStockSchema>) {
  const currentStock = await getCurrentStock(data.category)

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

  // For SELL_FREE_DEF, also update FINISHED_GOODS
  if (data.type === 'SELL_FREE_DEF') {
    const finishedGoodsStock = await getCurrentStock(StockCategory.FINISHED_GOODS)
    const finishedGoodsRunningTotal = finishedGoodsStock + data.quantity

    const transactions = await prisma.$transaction([
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
      prisma.stockTransaction.create({
        data: {
          date: data.date,
          type: 'SELL_FREE_DEF',
          category: 'FINISHED_GOODS',
          quantity: data.quantity,
          unit: 'LITERS',
          description: `Sold Free DEF: ${data.quantity}L`,
          runningTotal: finishedGoodsRunningTotal,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      transactions,
    })
  }

  // Regular transaction (ADD_UREA)
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

// Helper function to calculate stock summary
async function calculateStockSummary() {
  const ureaKg = await getCurrentStock(StockCategory.UREA)
  const freeDEF = await getCurrentStock(StockCategory.FREE_DEF)
  const finishedGoods = await getCurrentStock(StockCategory.FINISHED_GOODS)

  // Calculate buckets in liters from inventory
  const bucketsInLiters = await calculateBucketsInLiters()

  return {
    ureaKg,
    ureaBags: Number((ureaKg / 45).toFixed(2)),
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
