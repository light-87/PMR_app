import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { downloadBackupFromDrive } from '@/lib/google-drive'
import { createBackup } from '@/lib/backup'
import { parseExcelFile } from '@/lib/excel-parser'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import { Warehouse, ActionType, ExpenseAccount, TransactionType } from '@prisma/client'

export const dynamic = 'force-dynamic'

// Helper to parse dates from Excel backup
function parseBackupDate(val: string | number): Date {
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val)
    return new Date(date.y, date.m - 1, date.d)
  }
  return new Date(val)
}

// POST: Restore from a backup file
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const session = await verifySession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { driveFileId, fileName } = body

    if (!driveFileId) {
      return NextResponse.json(
        { success: false, message: 'Drive file ID is required' },
        { status: 400 }
      )
    }

    // Step 1: Create a backup of the current state
    console.log('Step 1: Creating backup of current state...')
    const currentBackup = await createBackup('MANUAL')

    if (!currentBackup.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to create backup of current state before restore',
          error: currentBackup.errorMessage,
        },
        { status: 500 }
      )
    }

    console.log('Current state backed up successfully:', currentBackup.driveFileId)

    // Step 2: Download the backup file from Google Drive
    console.log('Step 2: Downloading backup from Google Drive...')
    let backupBuffer: Buffer
    try {
      backupBuffer = await downloadBackupFromDrive(driveFileId)
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to download backup file from Google Drive',
          error: error instanceof Error ? error.message : 'Unknown error',
          currentBackupId: currentBackup.driveFileId,
        },
        { status: 500 }
      )
    }

    // Step 3: Parse the Excel file to ensure it's valid before deleting data
    console.log('Step 3: Parsing backup file...')
    let inventoryData: any[] = []
    let expenseData: any[] = []

    try {
      const workbook = XLSX.read(backupBuffer, { type: 'buffer' })

      // Check if required sheets exist
      if (!workbook.SheetNames.includes('Inventory')) {
        throw new Error('Backup file is missing "Inventory" sheet')
      }
      if (!workbook.SheetNames.includes('Expenses')) {
        throw new Error('Backup file is missing "Expenses" sheet')
      }

      // Read inventory data (excluding ID and CreatedAt columns)
      const inventorySheet = workbook.Sheets['Inventory']
      inventoryData = XLSX.utils.sheet_to_json(inventorySheet)

      // Read expense data (excluding ID and CreatedAt columns)
      const expensesSheet = workbook.Sheets['Expenses']
      expenseData = XLSX.utils.sheet_to_json(expensesSheet)

      console.log(`Found ${inventoryData.length} inventory records and ${expenseData.length} expense records`)
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to parse backup file',
          error: error instanceof Error ? error.message : 'Unknown error',
          currentBackupId: currentBackup.driveFileId,
        },
        { status: 500 }
      )
    }

    // Step 4: Delete all current data
    console.log('Step 4: Deleting all current data...')
    try {
      const deletedInventory = await prisma.inventoryTransaction.deleteMany({})
      const deletedExpenses = await prisma.expenseTransaction.deleteMany({})

      console.log(`Deleted ${deletedInventory.count} inventory records and ${deletedExpenses.count} expense records`)
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to delete current data',
          error: error instanceof Error ? error.message : 'Unknown error',
          currentBackupId: currentBackup.driveFileId,
        },
        { status: 500 }
      )
    }

    // Step 5: Restore data from backup
    console.log('Step 5: Restoring data from backup...')
    let inventoryRestored = 0
    let expensesRestored = 0
    const errors: string[] = []

    try {
      // Restore inventory transactions (sorted by date)
      const sortedInventory = inventoryData.sort((a, b) => {
        const dateA = parseBackupDate(a.Date)
        const dateB = parseBackupDate(b.Date)
        return dateA.getTime() - dateB.getTime()
      })

      for (const row of sortedInventory) {
        try {
          // Use the running total from the backup directly
          await prisma.inventoryTransaction.create({
            data: {
              date: parseBackupDate(row.Date),
              warehouse: row.Warehouse as Warehouse,
              bucketType: row['Bucket Type'] as string,
              action: row.Action as ActionType,
              quantity: Number(row.Quantity),
              buyerSeller: row['Buyer/Seller'] || 'N/A',
              runningTotal: Number(row['Running Total']),
            },
          })
          inventoryRestored++
        } catch (error) {
          errors.push(`Inventory row failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // Restore expense transactions (sorted by date)
      const sortedExpenses = expenseData.sort((a, b) => {
        const dateA = parseBackupDate(a.Date)
        const dateB = parseBackupDate(b.Date)
        return dateA.getTime() - dateB.getTime()
      })

      for (const row of sortedExpenses) {
        try {
          await prisma.expenseTransaction.create({
            data: {
              date: parseBackupDate(row.Date),
              amount: Number(row.Amount),
              account: row.Account as ExpenseAccount,
              type: row.Type as TransactionType,
              name: row.Name || 'N/A',
            },
          })
          expensesRestored++
        } catch (error) {
          errors.push(`Expense row failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      console.log(`Restored ${inventoryRestored} inventory records and ${expensesRestored} expense records`)

      // Create a log entry for the restore operation
      await prisma.backupLog.create({
        data: {
          backupType: 'MANUAL',
          driveFileId: driveFileId,
          inventoryCount: inventoryRestored,
          expenseCount: expensesRestored,
          status: 'SUCCESS',
          errorMessage: errors.length > 0 ? `Restore completed with ${errors.length} errors` : null,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Backup restored successfully',
        inventoryRestored,
        expensesRestored,
        currentBackupId: currentBackup.driveFileId,
        errors: errors.length > 0 ? errors : undefined,
      })
    } catch (error) {
      // If restore fails, log the failure
      await prisma.backupLog.create({
        data: {
          backupType: 'MANUAL',
          driveFileId: driveFileId,
          inventoryCount: inventoryRestored,
          expenseCount: expensesRestored,
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error during restore',
        },
      })

      return NextResponse.json(
        {
          success: false,
          message: 'Failed to restore data from backup',
          error: error instanceof Error ? error.message : 'Unknown error',
          inventoryRestored,
          expensesRestored,
          currentBackupId: currentBackup.driveFileId,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error restoring backup:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to restore backup',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
