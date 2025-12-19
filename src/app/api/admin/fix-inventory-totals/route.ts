import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { BucketType, Warehouse } from '@prisma/client'

export const dynamic = 'force-dynamic'

// POST - Recalculate all inventory running totals
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const log: string[] = []
    const corrections: Record<string, number> = {}

    // Get all bucket types and warehouses
    const bucketTypes = Object.values(BucketType)
    const warehouses = Object.values(Warehouse)

    // Process each bucket type + warehouse combination
    for (const bucketType of bucketTypes) {
      // Skip FREE_DEF for inventory (it's tracked in StockTransaction)
      if (bucketType === 'FREE_DEF') continue

      for (const warehouse of warehouses) {
        const key = `${bucketType}-${warehouse}`
        log.push(`\n=== Processing ${key} ===`)

        // Fetch all transactions for this combination in chronological order
        const transactions = await prisma.inventoryTransaction.findMany({
          where: { bucketType, warehouse },
          orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
        })

        if (transactions.length === 0) {
          log.push(`No transactions found for ${key}`)
          continue
        }

        let runningTotal = 0
        let correctionsCount = 0

        for (const transaction of transactions) {
          // Calculate what the running total should be
          runningTotal += transaction.quantity

          // Check if it matches the stored running total
          if (transaction.runningTotal !== runningTotal) {
            log.push(
              `[${transaction.id.substring(0, 8)}] ${transaction.date.toISOString().split('T')[0]} - ` +
              `CORRECTED: ${transaction.runningTotal} → ${runningTotal} ` +
              `(${transaction.action} ${Math.abs(transaction.quantity)})`
            )

            // Update the running total
            await prisma.inventoryTransaction.update({
              where: { id: transaction.id },
              data: { runningTotal }
            })

            correctionsCount++
          } else {
            log.push(
              `[${transaction.id.substring(0, 8)}] ${transaction.date.toISOString().split('T')[0]} - ` +
              `OK: ${runningTotal} (${transaction.action} ${Math.abs(transaction.quantity)})`
            )
          }
        }

        if (correctionsCount > 0) {
          corrections[key] = correctionsCount
          log.push(`${key}: ${correctionsCount} corrections made, final balance: ${runningTotal}`)
        } else {
          log.push(`${key}: No corrections needed, final balance: ${runningTotal}`)
        }
      }
    }

    // Get final balances
    const finalBalances: Record<string, Record<string, number>> = {}
    for (const bucketType of bucketTypes) {
      if (bucketType === 'FREE_DEF') continue

      finalBalances[bucketType] = {}
      for (const warehouse of warehouses) {
        const lastTransaction = await prisma.inventoryTransaction.findFirst({
          where: { bucketType, warehouse },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
          select: { runningTotal: true },
        })
        finalBalances[bucketType][warehouse] = lastTransaction?.runningTotal || 0
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Inventory running totals recalculated successfully',
      corrections,
      finalBalances,
      log,
    })
  } catch (error) {
    console.error('Inventory repair error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to repair inventory totals' },
      { status: 500 }
    )
  }
}
