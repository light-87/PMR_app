import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { StockCategory } from '@prisma/client'

export const dynamic = 'force-dynamic'

// POST - Recalculate all stock running totals
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

    // Process each stock category
    const categories = Object.values(StockCategory)

    for (const category of categories) {
      log.push(`\n=== Processing ${category} ===`)

      // Fetch all transactions for this category in chronological order
      const transactions = await prisma.stockTransaction.findMany({
        where: { category },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      })

      if (transactions.length === 0) {
        log.push(`No transactions found for ${category}`)
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
            `CORRECTED: ${transaction.runningTotal} → ${runningTotal} (${transaction.description || transaction.type})`
          )

          // Update the running total
          await prisma.stockTransaction.update({
            where: { id: transaction.id },
            data: { runningTotal }
          })

          correctionsCount++
        } else {
          log.push(
            `[${transaction.id.substring(0, 8)}] ${transaction.date.toISOString().split('T')[0]} - ` +
            `OK: ${runningTotal} (${transaction.description || transaction.type})`
          )
        }
      }

      corrections[category] = correctionsCount
      log.push(`${category}: ${correctionsCount} corrections made, final balance: ${runningTotal}`)
    }

    // Get final balances
    const finalBalances: Record<string, number> = {}
    for (const category of categories) {
      const lastTransaction = await prisma.stockTransaction.findFirst({
        where: { category },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        select: { runningTotal: true },
      })
      finalBalances[category] = lastTransaction?.runningTotal || 0
    }

    return NextResponse.json({
      success: true,
      message: 'Stock running totals recalculated successfully',
      corrections,
      finalBalances,
      log,
    })
  } catch (error) {
    console.error('Stock repair error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to repair stock totals' },
      { status: 500 }
    )
  }
}
