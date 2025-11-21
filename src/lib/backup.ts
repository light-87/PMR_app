import { prisma } from '@/lib/prisma'
import { uploadBackupToDrive } from '@/lib/google-drive'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'

export type BackupType = 'MANUAL' | 'AUTOMATIC'

interface BackupResult {
  success: boolean
  backupId?: string
  driveFileId?: string
  inventoryCount: number
  expenseCount: number
  stockCount: number
  errorMessage?: string
}

/**
 * Create a full database backup and upload to Google Drive
 */
export async function createBackup(type: BackupType): Promise<BackupResult> {
  let inventoryCount = 0
  let expenseCount = 0
  let stockCount = 0

  try {
    // Fetch all inventory transactions
    const inventoryTransactions = await prisma.inventoryTransaction.findMany({
      orderBy: { date: 'asc' },
    })
    inventoryCount = inventoryTransactions.length

    // Fetch all expense transactions
    const expenseTransactions = await prisma.expenseTransaction.findMany({
      orderBy: { date: 'asc' },
    })
    expenseCount = expenseTransactions.length

    // Fetch all stock transactions (if table exists)
    let stockTransactions = []
    try {
      stockTransactions = await prisma.stockTransaction.findMany({
        orderBy: { date: 'asc' },
      })
      stockCount = stockTransactions.length
    } catch (stockError) {
      console.log('Stock tracking not available yet in backup')
    }

    // Create Excel workbook
    const workbook = XLSX.utils.book_new()

    // Create Inventory sheet
    const inventoryData = inventoryTransactions.map((tx) => ({
      ID: tx.id,
      Date: format(new Date(tx.date), 'yyyy-MM-dd'),
      Warehouse: tx.warehouse,
      'Bucket Type': tx.bucketType,
      Action: tx.action,
      Quantity: tx.quantity,
      'Buyer/Seller': tx.buyerSeller,
      'Running Total': tx.runningTotal,
      'Created At': format(new Date(tx.createdAt), 'yyyy-MM-dd HH:mm:ss'),
    }))
    const inventorySheet = XLSX.utils.json_to_sheet(inventoryData)
    XLSX.utils.book_append_sheet(workbook, inventorySheet, 'Inventory')

    // Create Expenses sheet
    const expenseData = expenseTransactions.map((tx) => ({
      ID: tx.id,
      Date: format(new Date(tx.date), 'yyyy-MM-dd'),
      Amount: Number(tx.amount),
      Account: tx.account,
      Type: tx.type,
      Name: tx.name,
      'Created At': format(new Date(tx.createdAt), 'yyyy-MM-dd HH:mm:ss'),
    }))
    const expenseSheet = XLSX.utils.json_to_sheet(expenseData)
    XLSX.utils.book_append_sheet(workbook, expenseSheet, 'Expenses')

    // Create Stock sheet (if stock transactions exist)
    if (stockTransactions.length > 0) {
      const stockData = stockTransactions.map((tx) => ({
        ID: tx.id,
        Date: format(new Date(tx.date), 'yyyy-MM-dd'),
        Type: tx.type,
        Category: tx.category,
        Quantity: tx.quantity,
        Unit: tx.unit,
        Description: tx.description || '',
        'Running Total': tx.runningTotal,
        'Created At': format(new Date(tx.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      }))
      const stockSheet = XLSX.utils.json_to_sheet(stockData)
      XLSX.utils.book_append_sheet(workbook, stockSheet, 'Stock')
    }

    // Generate Excel buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Create filename with timestamp
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss')
    const fileName = `PMR_Backup_${timestamp}.xlsx`

    // Upload to Google Drive
    const driveFileId = await uploadBackupToDrive(buffer, fileName)

    // Log successful backup
    const backupLog = await prisma.backupLog.create({
      data: {
        backupType: type,
        driveFileId,
        inventoryCount,
        expenseCount,
        stockCount,
        status: 'SUCCESS',
      },
    })

    return {
      success: true,
      backupId: backupLog.id,
      driveFileId,
      inventoryCount,
      expenseCount,
      stockCount,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log failed backup
    await prisma.backupLog.create({
      data: {
        backupType: type,
        inventoryCount,
        expenseCount,
        stockCount,
        status: 'FAILED',
        errorMessage,
      },
    })

    return {
      success: false,
      inventoryCount,
      expenseCount,
      stockCount,
      errorMessage,
    }
  }
}

/**
 * Get the last successful backup date
 */
export async function getLastBackupDate(): Promise<Date | null> {
  const lastBackup = await prisma.backupLog.findFirst({
    where: { status: 'SUCCESS' },
    orderBy: { backupDate: 'desc' },
    select: { backupDate: true },
  })

  return lastBackup?.backupDate || null
}

/**
 * Check if a backup is needed (last backup was more than 24 hours ago)
 */
export async function isBackupNeeded(): Promise<boolean> {
  const lastBackupDate = await getLastBackupDate()

  if (!lastBackupDate) {
    // No backup ever made, backup is needed
    return true
  }

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  return lastBackupDate < twentyFourHoursAgo
}

/**
 * Get recent backup logs
 */
export async function getBackupLogs(limit: number = 20) {
  return prisma.backupLog.findMany({
    orderBy: { backupDate: 'desc' },
    take: limit,
  })
}

/**
 * Trigger backup if needed (called on sign-in)
 * This function is non-blocking - it won't make the user wait for backup
 */
export async function triggerBackupIfNeeded(): Promise<void> {
  try {
    const needed = await isBackupNeeded()

    if (needed) {
      // Run backup in background without waiting
      createBackup('AUTOMATIC').catch((error) => {
        console.error('Automatic backup failed:', error)
      })
    }
  } catch (error) {
    console.error('Error checking backup status:', error)
  }
}
