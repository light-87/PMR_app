// Session Types
export interface SessionData {
  pinId: string
  role: 'ADMIN' | 'EXPENSE_INVENTORY' | 'INVENTORY_ONLY'
  expiresAt: number
}

// Enum Types (mirror Prisma enums)
export type PinRole = 'ADMIN' | 'EXPENSE_INVENTORY' | 'INVENTORY_ONLY'

export type Warehouse = 'PALLAVI' | 'TULARAM' | 'FACTORY'

// BucketType is now a string (dynamic from database)
export type BucketType = string

export type ActionType = 'STOCK' | 'SELL'

// Bucket Type Configuration (dynamic from database)
export interface BucketTypeConfig {
  id: string
  code: string
  name: string
  capacityLiters: number
  isActive: boolean
  isSystem: boolean
  createdAt: string
  updatedAt: string
}

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

// Legacy bucket sizes for backwards compatibility with old transactions
// New transactions will use dynamic bucket types from BucketTypeConfig
export const BUCKET_SIZES: Record<string, number> = {
  TATA_G: 20,
  TATA_W: 20,
  AL_10_LTR: 10,
  AL: 20,
  BB: 20,
  ES: 20,
  MH: 20,
  MH_10_LTR: 10,
  TATA_10_LTR: 10,
  IBC_TANK: 0, // Not counted as sellable product (for counting empty tanks)
  AP_BLUE: 20,
  FREE_DEF: 0, // Not counted (liters tracked separately in quantity field)
}

// Helper function to get bucket size (checks dynamic config first, falls back to legacy)
export function getBucketSize(bucketTypeCode: string, bucketTypes?: BucketTypeConfig[]): number {
  if (bucketTypes) {
    const bucketType = bucketTypes.find(bt => bt.code === bucketTypeCode)
    if (bucketType) return bucketType.capacityLiters
  }
  return BUCKET_SIZES[bucketTypeCode] || 0
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
  FACTORY: 'Factory',
}

// Stock Tracking Types
export type StockTransactionType =
  | 'ADD_UREA'
  | 'PRODUCE_BATCH'
  | 'SELL_FREE_DEF'
  | 'FILL_BUCKETS'
  | 'SELL_BUCKETS'

export type StockCategory = 'UREA' | 'FREE_DEF' | 'FINISHED_GOODS'

export type StockUnit = 'KG' | 'LITERS' | 'BAGS'

export interface StockTransaction {
  id: string
  date: string
  type: StockTransactionType
  category: StockCategory
  quantity: number
  unit: StockUnit
  description?: string
  runningTotal: number
  createdAt: string
  updatedAt: string
}

export interface StockSummary {
  ureaKg: number
  ureaBags: number
  ureaCansProduceL: number
  freeDEF: number
  bucketsInLiters: number
  finishedGoods: number
}

export interface StockResponse {
  transactions: StockTransaction[]
  summary: StockSummary
}

export interface StockInput {
  date: Date
  type: StockTransactionType
  category: StockCategory
  quantity: number
  unit: StockUnit
  description?: string
}

// Stock constants
export const UREA_PER_BATCH_KG = 360
export const UREA_BAGS_PER_BATCH = 8
export const KG_PER_BAG = 45
export const LITERS_PER_BATCH = 1000

export const STOCK_TYPE_LABELS: Record<StockTransactionType, string> = {
  ADD_UREA: 'Add Urea',
  PRODUCE_BATCH: 'Produce Batch',
  SELL_FREE_DEF: 'Sell Free DEF',
  FILL_BUCKETS: 'Fill Buckets',
  SELL_BUCKETS: 'Sell Buckets',
}

export const STOCK_CATEGORY_LABELS: Record<StockCategory, string> = {
  UREA: 'Urea (Raw Material)',
  FREE_DEF: 'Free DEF',
  FINISHED_GOODS: 'Finished Goods',
}
