import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { z } from 'zod'
import { BucketType, Warehouse, ActionType } from '@prisma/client'

export const dynamic = 'force-dynamic'

// Validation schema for updating inventory transaction
const updateInventorySchema = z.object({
  date: z.string().transform(str => new Date(str)).optional(),
  warehouse: z.nativeEnum(Warehouse).optional(),
  bucketType: z.nativeEnum(BucketType).optional(),
  action: z.nativeEnum(ActionType).optional(),
  quantity: z.number().positive().optional(),
  buyerSeller: z.string().min(1).optional(),
})

// PUT - Update inventory transaction (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admin can edit
    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateInventorySchema.parse(body)

    // Get existing transaction
    const existing = await prisma.inventoryTransaction.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Merge with existing data
    const updatedData = {
      date: validatedData.date || existing.date,
      warehouse: validatedData.warehouse || existing.warehouse,
      bucketType: validatedData.bucketType || existing.bucketType,
      action: validatedData.action || existing.action,
      quantity: validatedData.quantity
        ? (validatedData.action || existing.action) === 'SELL'
          ? -validatedData.quantity
          : validatedData.quantity
        : existing.quantity,
      buyerSeller: validatedData.buyerSeller || existing.buyerSeller,
    }

    // Update the transaction
    const transaction = await prisma.inventoryTransaction.update({
      where: { id },
      data: updatedData,
    })

    // Recalculate running totals for all subsequent transactions
    await recalculateRunningTotals(
      updatedData.bucketType,
      updatedData.warehouse
    )

    // Also recalculate old bucket/warehouse if changed
    if (
      validatedData.bucketType && validatedData.bucketType !== existing.bucketType ||
      validatedData.warehouse && validatedData.warehouse !== existing.warehouse
    ) {
      await recalculateRunningTotals(existing.bucketType, existing.warehouse)
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
    console.error('Inventory PUT error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update transaction' },
      { status: 500 }
    )
  }
}

// DELETE - Delete inventory transaction (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admin can delete
    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Get transaction before deleting
    const transaction = await prisma.inventoryTransaction.findUnique({
      where: { id },
    })

    if (!transaction) {
      return NextResponse.json(
        { success: false, message: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Delete transaction
    await prisma.inventoryTransaction.delete({
      where: { id },
    })

    // Recalculate running totals
    await recalculateRunningTotals(transaction.bucketType, transaction.warehouse)

    return NextResponse.json({
      success: true,
      message: 'Transaction deleted',
    })
  } catch (error) {
    console.error('Inventory DELETE error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete transaction' },
      { status: 500 }
    )
  }
}

// Helper function to recalculate all running totals for a bucket+warehouse
async function recalculateRunningTotals(
  bucketType: BucketType,
  warehouse: Warehouse
) {
  // Get all transactions for this combination, ordered by date
  const transactions = await prisma.inventoryTransaction.findMany({
    where: { bucketType, warehouse },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  })

  // Recalculate running totals
  let runningTotal = 0
  for (const transaction of transactions) {
    runningTotal += transaction.quantity
    await prisma.inventoryTransaction.update({
      where: { id: transaction.id },
      data: { runningTotal },
    })
  }
}
