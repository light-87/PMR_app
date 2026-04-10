import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { StockCategory } from '@prisma/client'

export const dynamic = 'force-dynamic'

// POST - Fix stock transaction and recalculate running totals
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const { action, transactionId, newQuantity } = await request.json()

    if (!action || !['preview', 'apply'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Invalid action. Use "preview" or "apply".' },
        { status: 400 }
      )
    }

    if (!transactionId || typeof newQuantity !== 'number') {
      return NextResponse.json(
        { success: false, message: 'Missing transactionId or newQuantity' },
        { status: 400 }
      )
    }

    // Fetch the transaction to be corrected
    const transaction = await prisma.stockTransaction.findUnique({
      where: { id: transactionId },
    })

    if (!transaction) {
      return NextResponse.json(
        { success: false, message: 'Transaction not found' },
        { status: 404 }
      )
    }

    const oldQuantity = transaction.quantity
    const difference = oldQuantity - newQuantity
    const percentageChange = (difference / oldQuantity) * 100

    // Fetch all transactions from this date onwards in the same category
    const affectedTransactions = await prisma.stockTransaction.findMany({
      where: {
        category: transaction.category,
        date: {
          gte: transaction.date,
        },
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    })

    // Calculate what running totals should be
    let runningTotal = 0

    // Get sum of all transactions BEFORE this one
    const previousSum = await prisma.stockTransaction.aggregate({
      where: {
        category: transaction.category,
        OR: [
          { date: { lt: transaction.date } },
          {
            date: { equals: transaction.date },
            createdAt: { lt: transaction.createdAt },
          },
        ],
      },
      _sum: { quantity: true },
    })

    runningTotal = previousSum._sum.quantity || 0

    // Simulate what the running totals would be with corrected value
    const recalculatedTotals: Record<string, number> = {}
    let newRunningTotal = 0

    for (const tx of affectedTransactions) {
      if (tx.id === transactionId) {
        // Use new quantity for the corrected transaction
        runningTotal += newQuantity
      } else {
        // Use original quantity for other transactions
        runningTotal += tx.quantity
      }
      recalculatedTotals[tx.id] = runningTotal

      // Track the running total after the corrected transaction
      if (tx.id === transactionId) {
        newRunningTotal = runningTotal
      }
    }

    // If action is "preview", return the calculation
    if (action === 'preview') {
      return NextResponse.json({
        success: true,
        message: 'Preview generated successfully',
        details: {
          txId: transactionId,
          oldQuantity,
          newQuantity,
          difference: Math.abs(difference),
          affectedTransactions: affectedTransactions.length,
          newRunningTotal,
          log: [
            `Transaction ID: ${transactionId}`,
            `Date: ${transaction.date.toISOString().split('T')[0]}`,
            `OLD QUANTITY: ${oldQuantity} kg`,
            `NEW QUANTITY: ${newQuantity} kg`,
            `ADJUSTMENT: -${Math.abs(difference)} kg (-${Math.abs(percentageChange).toFixed(1)}%)`,
            `RUNNING TOTAL (After): ${newRunningTotal} kg`,
            `AFFECTED TRANSACTIONS: ${affectedTransactions.length}`,
            `APPLIED BY: ${session.role}`,
            `TIMESTAMP: ${new Date().toISOString()}`,
          ],
        },
      })
    }

    // If action is "apply", update the database
    if (action === 'apply') {
      // Update the corrected transaction
      await prisma.stockTransaction.update({
        where: { id: transactionId },
        data: { quantity: newQuantity },
      })

      // Recalculate all running totals from this transaction onwards
      for (const [txId, newTotal] of Object.entries(recalculatedTotals)) {
        await prisma.stockTransaction.update({
          where: { id: txId },
          data: { runningTotal: newTotal },
        })
      }

      const logMessage = `[FIX-STOCK-ENTRY] TX: ${transactionId} | QUANTITY: ${oldQuantity} → ${newQuantity} | ADJUSTMENT: -${Math.abs(difference)} kg (-${Math.abs(percentageChange).toFixed(1)}%) | AFFECTED: ${affectedTransactions.length} transactions | APPLIED BY: ${session.role} | TIME: ${new Date().toISOString()}`

      console.log(logMessage)

      return NextResponse.json({
        success: true,
        message: 'Stock transaction fixed and running totals recalculated successfully',
        details: {
          txId: transactionId,
          oldQuantity,
          newQuantity,
          difference: Math.abs(difference),
          affectedTransactions: affectedTransactions.length,
          newRunningTotal,
          log: [
            `✅ CORRECTION APPLIED`,
            `Transaction ID: ${transactionId}`,
            `OLD QUANTITY: ${oldQuantity} kg`,
            `NEW QUANTITY: ${newQuantity} kg`,
            `ADJUSTMENT: -${Math.abs(difference)} kg (-${Math.abs(percentageChange).toFixed(1)}%)`,
            `RUNNING TOTAL (After): ${newRunningTotal} kg`,
            `RECALCULATED: ${affectedTransactions.length} transactions`,
            `APPLIED BY: ${session.role}`,
            `TIMESTAMP: ${new Date().toISOString()}`,
            `STATUS: Successfully updated database`,
          ],
        },
      })
    }
  } catch (error) {
    console.error('Stock entry fix error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fix stock entry' },
      { status: 500 }
    )
  }
}
