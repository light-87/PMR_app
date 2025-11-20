import * as XLSX from 'xlsx'
import { z } from 'zod'
import { Warehouse, BucketType, ActionType, ExpenseAccount, TransactionType } from '@prisma/client'

// Validation schemas for Excel rows
const inventoryRowSchema = z.object({
  Date: z.string().or(z.number()).transform(val => {
    if (typeof val === 'number') {
      // Excel serial date number to Date
      const date = XLSX.SSF.parse_date_code(val)
      return new Date(date.y, date.m - 1, date.d)
    }
    return new Date(val)
  }),
  Warehouse: z.nativeEnum(Warehouse),
  BucketType: z.nativeEnum(BucketType),
  Action: z.nativeEnum(ActionType),
  Quantity: z.number().positive(),
  BuyerSeller: z.string().min(1),
})

const expenseRowSchema = z.object({
  Date: z.string().or(z.number()).transform(val => {
    if (typeof val === 'number') {
      // Excel serial date number to Date
      const date = XLSX.SSF.parse_date_code(val)
      return new Date(date.y, date.m - 1, date.d)
    }
    return new Date(val)
  }),
  Amount: z.number().positive(),
  Account: z.nativeEnum(ExpenseAccount),
  Type: z.nativeEnum(TransactionType),
  Name: z.string().min(1),
})

export type InventoryRow = z.infer<typeof inventoryRowSchema>
export type ExpenseRow = z.infer<typeof expenseRowSchema>

export interface ParsedExcelData {
  inventory: InventoryRow[]
  expenses: ExpenseRow[]
}

export interface ParseError {
  sheet: 'Inventory' | 'Expenses'
  row: number
  field?: string
  message: string
}

export interface ParseResult {
  success: boolean
  data?: ParsedExcelData
  errors?: ParseError[]
}

/**
 * Parse an Excel file buffer and extract Inventory and Expenses data
 */
export function parseExcelFile(buffer: Buffer): ParseResult {
  const errors: ParseError[] = []
  const inventory: InventoryRow[] = []
  const expenses: ExpenseRow[] = []

  try {
    // Read the workbook
    const workbook = XLSX.read(buffer, { type: 'buffer' })

    // Check if required sheets exist
    if (!workbook.SheetNames.includes('Inventory')) {
      errors.push({
        sheet: 'Inventory',
        row: 0,
        message: 'Missing required sheet "Inventory"',
      })
    }

    if (!workbook.SheetNames.includes('Expenses')) {
      errors.push({
        sheet: 'Expenses',
        row: 0,
        message: 'Missing required sheet "Expenses"',
      })
    }

    // Return early if sheets are missing
    if (errors.length > 0) {
      return { success: false, errors }
    }

    // Parse Inventory sheet
    const inventorySheet = workbook.Sheets['Inventory']
    const inventoryRawData = XLSX.utils.sheet_to_json(inventorySheet, { raw: false })

    inventoryRawData.forEach((row: unknown, index: number) => {
      try {
        const validatedRow = inventoryRowSchema.parse(row)
        inventory.push(validatedRow)
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach(err => {
            errors.push({
              sheet: 'Inventory',
              row: index + 2, // +2 because Excel is 1-indexed and has a header row
              field: err.path.join('.'),
              message: err.message,
            })
          })
        }
      }
    })

    // Parse Expenses sheet
    const expensesSheet = workbook.Sheets['Expenses']
    const expensesRawData = XLSX.utils.sheet_to_json(expensesSheet, { raw: false })

    expensesRawData.forEach((row: unknown, index: number) => {
      try {
        const validatedRow = expenseRowSchema.parse(row)
        expenses.push(validatedRow)
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach(err => {
            errors.push({
              sheet: 'Expenses',
              row: index + 2, // +2 because Excel is 1-indexed and has a header row
              field: err.path.join('.'),
              message: err.message,
            })
          })
        }
      }
    })

    // Return errors if any validation failed
    if (errors.length > 0) {
      return { success: false, errors }
    }

    // Return successfully parsed data
    return {
      success: true,
      data: { inventory, expenses },
    }
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          sheet: 'Inventory',
          row: 0,
          message: error instanceof Error ? error.message : 'Failed to parse Excel file',
        },
      ],
    }
  }
}

/**
 * Format parse errors into a readable string
 */
export function formatParseErrors(errors: ParseError[]): string {
  return errors
    .map(err => {
      const location = err.row > 0 ? `Row ${err.row}` : 'Sheet'
      const field = err.field ? ` (${err.field})` : ''
      return `${err.sheet} - ${location}${field}: ${err.message}`
    })
    .join('\n')
}
