// Session Types
export interface SessionData {
  pinId: string
  role: 'ADMIN' | 'EXPENSE_INVENTORY' | 'INVENTORY_ONLY'
  expiresAt: number
}

// Enum Types (mirror Prisma enums)
export type PinRole = 'ADMIN' | 'EXPENSE_INVENTORY' | 'INVENTORY_ONLY'

export type Warehouse = 'PALLAVI' | 'TULARAM'

export type BucketType =
  | 'TATA_G'
  | 'TATA_W'
  | 'AL_10_LTR'
  | 'AL'
  | 'BB'
  | 'ES'
  | 'MH'
  | 'MH_10_LTR'
  | 'TATA_10_LTR'
  | 'IBC_TANK'

export type ActionType = 'STOCK' | 'SELL'

export type ExpenseAccount =
  | 'CASH'
  | 'PRASHANT_GAYDHANE'
  | 'PMR'
  | 'KPG_SAVING'
  | 'KP_ENTERPRISES'

export type TransactionType = 'INCOME' | 'EXPENSE'

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// Inventory Types
export interface InventoryTransaction {
  id: string
  date: string
  warehouse: Warehouse
  bucketType: BucketType
  action: ActionType
  quantity: number
  buyerSeller: string
  runningTotal: number
  createdAt: string
  updatedAt: string
}

export interface InventorySummary {
  bucketType: BucketType
  pallavi: number
  tularam: number
  total: number
}

export interface InventoryResponse {
  transactions: InventoryTransaction[]
  summary: InventorySummary[]
}

// Expense Types
export interface ExpenseTransaction {
  id: string
  date: string
  amount: number
  account: ExpenseAccount
  type: TransactionType
  name: string
  createdAt: string
  updatedAt: string
}

export interface ExpensePagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ExpenseResponse {
  transactions: ExpenseTransaction[]
  pagination: ExpensePagination
  uniqueNames: string[]
}

// Dashboard Types
export interface DashboardSummary {
  totalIncome: number
  totalExpense: number
  netProfit: number
}

export interface MonthlyData {
  month: string
  income: number
  expense: number
  net: number
}

export interface AccountBreakdown {
  account: string
  amount: number
}

export interface DashboardResponse {
  summary: DashboardSummary
  monthlyData: MonthlyData[]
  accountBreakdown: {
    income: AccountBreakdown[]
    expense: AccountBreakdown[]
  }
  trendData: {
    month: string
    income: number
    expense: number
  }[]
}

// Statement Types
export interface StatementResponse {
  name: string
  transactions: ExpenseTransaction[]
  totalBalance: number
}

// Backup Types
export interface BackupLog {
  id: string
  backupDate: string
  backupType: string
  driveFileId?: string
  inventoryCount: number
  expenseCount: number
  status: string
  errorMessage?: string
}

// Form Input Types
export interface InventoryInput {
  date: Date
  warehouse: Warehouse
  bucketType: BucketType
  action: ActionType
  quantity: number
  buyerSeller: string
}

export interface ExpenseInput {
  date: Date
  amount: number
  account: ExpenseAccount
  type: TransactionType
  name: string
}

// Display Labels
export const BUCKET_TYPE_LABELS: Record<BucketType, string> = {
  TATA_G: 'TATA G',
  TATA_W: 'TATA W',
  AL_10_LTR: 'AL 10 ltr',
  AL: 'AL',
  BB: 'BB',
  ES: 'ES',
  MH: 'MH',
  MH_10_LTR: 'MH 10 Ltr',
  TATA_10_LTR: 'TATA 10 Ltr',
  IBC_TANK: 'IBC tank',
}

export const ACCOUNT_LABELS: Record<ExpenseAccount, string> = {
  CASH: 'Cash',
  PRASHANT_GAYDHANE: 'Prashant Gaydhane',
  PMR: 'PMR',
  KPG_SAVING: 'KPG Saving',
  KP_ENTERPRISES: 'KP Enterprises',
}

export const WAREHOUSE_LABELS: Record<Warehouse, string> = {
  PALLAVI: 'Pallavi',
  TULARAM: 'Tularam',
}
