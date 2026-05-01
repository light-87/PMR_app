// Session Types
export interface SessionData {
  pinId: string
  role: 'ADMIN' | 'EXPENSE_INVENTORY' | 'INVENTORY_ONLY'
  expiresAt: number
}

// Enum Types (mirror Prisma enums)
export type PinRole = 'ADMIN' | 'EXPENSE_INVENTORY' | 'INVENTORY_ONLY'

export type Warehouse = 'PALLAVI' | 'TULARAM' | 'FACTORY'

export type BucketType =
  | 'TATA_G'
  | 'TATA_W'
  | 'TATA_HP'
  | 'AL_10_LTR'
  | 'AL'
  | 'BB'
  | 'ES'
  | 'MH'
  | 'MH_10_LTR'
  | 'TATA_10_LTR'
  | 'IBC_TANK'
  | 'AP_BLUE'
  | 'INDIAN_OIL_20L'
  | 'FREE_DEF'

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
  stockCount: number
  leadsCount: number
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
  TATA_HP: 'TATA HP',
  AL_10_LTR: 'AL 10 ltr',
  AL: 'AL',
  BB: 'BB',
  ES: 'ES',
  MH: 'MH',
  MH_10_LTR: 'MH 10 Ltr',
  TATA_10_LTR: 'TATA 10 Ltr',
  IBC_TANK: 'IBC tank',
  AP_BLUE: 'AP Blue',
  INDIAN_OIL_20L: 'Indian Oil 20 Ltr',
  FREE_DEF: 'Free DEF',
}

// Bucket sizes in liters (0 for non-sellable items)
export const BUCKET_SIZES: Record<BucketType, number> = {
  TATA_G: 20,
  TATA_W: 20,
  TATA_HP: 20,
  AL_10_LTR: 10,
  AL: 20,
  BB: 20,
  ES: 20,
  MH: 20,
  MH_10_LTR: 10,
  TATA_10_LTR: 10,
  IBC_TANK: 0, // Not counted as sellable product (for counting empty tanks)
  AP_BLUE: 20,
  INDIAN_OIL_20L: 20,
  FREE_DEF: 0, // Not counted (liters tracked separately in quantity field)
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

export type BagSize = 'KG_45' | 'KG_50'

export interface StockTransaction {
  id: string
  date: string
  type: StockTransactionType
  category: StockCategory
  quantity: number
  unit: StockUnit
  bagSize?: BagSize | null
  description?: string
  runningTotal: number
  createdAt: string
  updatedAt: string
}

export interface StockSummary {
  ureaKg: number
  ureaBags45: number
  ureaBags50: number
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
  bagSize?: BagSize
  description?: string
}

// Stock constants
export const UREA_PER_BATCH_KG = 360
export const LITERS_PER_BATCH = 1000

export const KG_PER_BAG: Record<BagSize, number> = {
  KG_45: 45,
  KG_50: 50,
}

export const BAG_SIZE_LABELS: Record<BagSize, string> = {
  KG_45: '45 kg',
  KG_50: '50 kg',
}

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

// Daily Report Types
export interface FinancialMetrics {
  totalIncome: number
  totalExpense: number
  netProfit: number
  transactionCount: number
  topAccount: {
    account: ExpenseAccount
    amount: number
  } | null
  accountBreakdown: {
    account: ExpenseAccount
    income: number
    expense: number
  }[]
  comparison: {
    incomeTrend: number // percentage change from previous day
    expenseTrend: number
    netTrend: number
  }
}

export interface InventoryMetrics {
  totalBucketsMoved: number
  bucketsStocked: number
  bucketsSold: number
  activeBucketTypes: number
  currentStockLevel: number // percentage
  mostActiveBucket: {
    type: BucketType
    quantity: number
  } | null
  warehouseActivity: {
    warehouse: Warehouse
    stocked: number
    sold: number
  }[]
}

export interface ProductionMetrics {
  litersProduced: number
  ureaConsumed: number
  batchesCompleted: number
  freeDEFSold: number
  currentUreaStock: number
  productionEfficiency: number // percentage
}

export interface HealthMetrics {
  overallScore: number // 0-100
  status: 'EXCELLENT' | 'GOOD' | 'ATTENTION_NEEDED' | 'CRITICAL'
  alerts: {
    type: 'NEGATIVE_CASH_FLOW' | 'LOW_STOCK' | 'LOW_UREA' | 'NO_PRODUCTION'
    severity: 'HIGH' | 'MEDIUM' | 'LOW'
    message: string
  }[]
  totalActivities: number
  operationalEfficiency: number // percentage
}

export type TimelineItemType = 'EXPENSE' | 'INVENTORY' | 'STOCK'

export interface TimelineItem {
  id: string
  time: string // ISO datetime
  type: TimelineItemType
  icon: string
  title: string
  description: string
  amount?: number
  details: Record<string, unknown>
  colorClass: string
}

export interface QuickInsight {
  id: string
  type: 'SUCCESS' | 'WARNING' | 'INFO' | 'TIP'
  icon: string
  message: string
}

export interface DailyReportData {
  date: string
  financial: FinancialMetrics
  inventory: InventoryMetrics
  production: ProductionMetrics
  health: HealthMetrics
  timeline: TimelineItem[]
  insights: QuickInsight[]
}

export interface DailyReportResponse {
  success: boolean
  data?: DailyReportData
  error?: string
}

// Lead Types
export type InquiryType = 'PRODUCT_DETAILS' | 'FACTORY_SETUP' | 'GENERAL_CALL'

export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'INTERESTED'
  | 'VISIT_SCHEDULED'
  | 'CONVERTED'
  | 'DEAD'

export type CallOutcome =
  | 'INTERESTED'
  | 'NEEDS_MORE_INFO'
  | 'CALL_BACK_LATER'
  | 'TALK_TO_BOSS'
  | 'NOT_GENUINE'
  | 'WRONG_NUMBER'
  | 'NO_ANSWER'
  | 'BUSY'

export type NextActionType =
  | 'CALL'
  | 'SEND_DETAILS'
  | 'SCHEDULE_OWNER_CALL'
  | 'SCHEDULE_VISIT'
  | 'FOLLOW_UP_CALL'
  | 'SEND_QUOTE'

export type VisitStatus =
  | 'SCHEDULED'
  | 'RESCHEDULED'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'CANCELLED'

export type VisitOutcome =
  | 'VERY_INTERESTED'
  | 'INTERESTED'
  | 'NEEDS_TIME'
  | 'NOT_INTERESTED'

export type DeadLeadReason =
  | 'NOT_INTERESTED'
  | 'WRONG_NUMBER'
  | 'SPAM'
  | 'CLICKED_BY_MISTAKE'
  | 'COMPETITOR'
  | 'ALREADY_HAS_SUPPLIER'

export interface Lead {
  id: string
  name: string
  phone: string
  whatsappNumber?: string
  countryCode: string
  company?: string
  inquiryType: InquiryType
  status: LeadStatus
  lastCallDate?: string
  callOutcome?: CallOutcome
  nextActionType?: NextActionType
  nextActionDate?: string
  visitDate?: string
  visitStatus?: VisitStatus
  visitOutcome?: VisitOutcome
  visitNotes?: string
  deadReason?: DeadLeadReason
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface LeadInput {
  name: string
  phone: string
  whatsappNumber?: string
  countryCode?: string
  company?: string
  inquiryType?: InquiryType
  status?: LeadStatus
  callOutcome?: CallOutcome
  nextActionType?: NextActionType
  nextActionDate?: Date
  visitDate?: Date
  visitStatus?: VisitStatus
  visitOutcome?: VisitOutcome
  visitNotes?: string
  deadReason?: DeadLeadReason
  notes?: string
}

export interface LeadResponse {
  leads: Lead[]
  total: number
}

// Lead Display Labels
export const INQUIRY_TYPE_LABELS: Record<InquiryType, string> = {
  PRODUCT_DETAILS: 'Product Details',
  FACTORY_SETUP: 'Factory Setup',
  GENERAL_CALL: 'General Call',
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  INTERESTED: 'Interested',
  VISIT_SCHEDULED: 'Visit Scheduled',
  CONVERTED: 'Converted',
  DEAD: 'Dead',
}

export const CALL_OUTCOME_LABELS: Record<CallOutcome, string> = {
  INTERESTED: 'Interested - Genuine',
  NEEDS_MORE_INFO: 'Needs More Info',
  CALL_BACK_LATER: 'Call Back Later',
  TALK_TO_BOSS: 'Talk to Boss',
  NOT_GENUINE: 'Not Genuine / Spam',
  WRONG_NUMBER: 'Wrong Number',
  NO_ANSWER: 'No Answer',
  BUSY: 'Busy',
}

export const NEXT_ACTION_LABELS: Record<NextActionType, string> = {
  CALL: 'Call',
  SEND_DETAILS: 'Send Details',
  SCHEDULE_OWNER_CALL: 'Schedule Owner Call',
  SCHEDULE_VISIT: 'Schedule Visit',
  FOLLOW_UP_CALL: 'Follow Up Call',
  SEND_QUOTE: 'Send Quote',
}

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  SCHEDULED: 'Scheduled',
  RESCHEDULED: 'Rescheduled',
  COMPLETED: 'Completed',
  NO_SHOW: 'No Show',
  CANCELLED: 'Cancelled',
}

export const VISIT_OUTCOME_LABELS: Record<VisitOutcome, string> = {
  VERY_INTERESTED: 'Very Interested',
  INTERESTED: 'Interested',
  NEEDS_TIME: 'Needs Time',
  NOT_INTERESTED: 'Not Interested',
}

export const DEAD_REASON_LABELS: Record<DeadLeadReason, string> = {
  NOT_INTERESTED: 'Not Interested',
  WRONG_NUMBER: 'Wrong Number',
  SPAM: 'Spam / Fake',
  CLICKED_BY_MISTAKE: 'Clicked by Mistake',
  COMPETITOR: 'Competitor',
  ALREADY_HAS_SUPPLIER: 'Already Has Supplier',
}

// Status colors for UI
export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  NEW: 'bg-blue-100 text-blue-800 border-blue-300',
  CONTACTED: 'bg-purple-100 text-purple-800 border-purple-300',
  INTERESTED: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  VISIT_SCHEDULED: 'bg-orange-100 text-orange-800 border-orange-300',
  CONVERTED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  DEAD: 'bg-gray-100 text-gray-800 border-gray-300',
}

// Inquiry type colors for UI
export const INQUIRY_TYPE_COLORS: Record<InquiryType, string> = {
  PRODUCT_DETAILS: 'bg-blue-100 text-blue-800 border-blue-300',
  FACTORY_SETUP: 'bg-orange-100 text-orange-800 border-orange-300',
  GENERAL_CALL: 'bg-gray-100 text-gray-800 border-gray-300',
}

// Common country codes
export const COUNTRY_CODES = [
  { code: '91', country: 'India', flag: '🇮🇳' },
  { code: '1', country: 'USA/Canada', flag: '🇺🇸' },
  { code: '44', country: 'UK', flag: '🇬🇧' },
  { code: '971', country: 'UAE', flag: '🇦🇪' },
  { code: '966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '65', country: 'Singapore', flag: '🇸🇬' },
  { code: '60', country: 'Malaysia', flag: '🇲🇾' },
  { code: '61', country: 'Australia', flag: '🇦🇺' },
  { code: '49', country: 'Germany', flag: '🇩🇪' },
  { code: '33', country: 'France', flag: '🇫🇷' },
]

// Inventory Dashboard Types
export type TimePeriodView = 'daily' | 'monthly' | 'alltime'
export type DailyPeriod = '7days' | '30days' | 'custom'
export type MonthlyPeriod = 'current' | '3months' | '6months' | '12months'

export interface InventoryOverviewMetrics {
  totalStocked: number
  totalSold: number
  stockedChange: number // % change from previous period
  soldChange: number
  turnoverRate: number
  currentStockValue: number // Total buckets in stock
}

export interface MovementTrendDataPoint {
  date: string // formatted date
  stocked: number
  sold: number
  net: number // stocked - sold
}

export interface ForecastDataPoint {
  date: string
  actual?: number // if historical
  projected?: number // if forecast
}

export interface BucketPerformance {
  bucketType: BucketType
  totalStocked: number
  totalSold: number
  currentStock: number
  turnoverRate: number
  avgDaysToSell: number | null
  status: 'fast' | 'moderate' | 'slow'
}

export interface ReorderRecommendation {
  bucketType: BucketType
  currentStock: number
  avgDailyConsumption: number
  daysUntilStockout: number | null // null if no consumption
  status: 'urgent' | 'soon' | 'sufficient' | 'nodata'
  recommendedOrderQty: number
}

export interface TopEntity {
  name: string
  totalQuantity: number
  transactionCount: number
  lastTransactionDate: string
}

// Free DEF Analytics Types
export interface FreeDefOverviewMetrics {
  produced: number // Liters produced
  consumedByBuckets: number // Liters consumed for bucket sales
  soldDirect: number // Liters sold directly to customers
  currentStock: number // Current stock in liters
  producedChange: number // % change from previous period
  consumedChange: number // % change
  soldChange: number // % change
}

export interface FreeDefFlowDataPoint {
  date: string
  produced: number
  consumed: number
  soldDirect: number
  net: number // produced - consumed - soldDirect
}

export interface ProductionForecastData {
  currentStock: number // Liters
  dailyConsumption: number // Liters/day
  bucketConsumption: number // Liters/day from bucket sales
  directSales: number // Liters/day from direct sales
  daysUntilStockout: number | null
  status: 'urgent' | 'warning' | 'sufficient' | 'nodata'
  batchesNeeded: number
  targetStock: number // For 60 days supply
  nextBatchDate: string | null
  followingBatchDate: string | null
}

export interface FreeDefCustomerData {
  topDirectBuyers: TopEntity[] // Top customers buying loose DEF
  bucketImpact: {
    bucketType: BucketType
    bucketsSold: number
    litersConsumed: number
  }[]
}

export interface InventoryDashboardData {
  overview: InventoryOverviewMetrics
  movementTrends: MovementTrendDataPoint[]
  forecast: ForecastDataPoint[]
  bucketPerformance: BucketPerformance[]
  reorderRecommendations: ReorderRecommendation[]
  topBuyers: TopEntity[]
  topSuppliers: TopEntity[]
  freeDef: {
    overview: FreeDefOverviewMetrics
    flowData: FreeDefFlowDataPoint[]
    productionForecast: ProductionForecastData
    customerData: FreeDefCustomerData
  }
}

export interface InventoryDashboardResponse {
  success: boolean
  data?: InventoryDashboardData
  message?: string
  error?: string
}

// AI Lab Types

export interface VoiceParsedData {
  module: 'inventory' | 'expense' | 'stock'
  date: string
  // Inventory fields
  warehouse?: Warehouse
  bucketType?: BucketType
  action?: ActionType
  quantity?: number
  buyerSeller?: string
  // Expense fields
  amount?: number
  account?: ExpenseAccount
  transactionType?: TransactionType
  name?: string
  // Stock fields
  stockType?: StockTransactionType
  stockCategory?: StockCategory
  unit?: StockUnit
  description?: string
  // Metadata
  isNewName: boolean
  confidence: number // 0-1
}

export interface VoiceParseResponse {
  transcript: string
  parsed: VoiceParsedData
  existingNames: string[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export type AIQueryType =
  | 'EXPENSE_SUMMARY'
  | 'INVENTORY_STOCK'
  | 'INVENTORY_SALES'
  | 'STOCK_STATUS'
  | 'LEAD_PIPELINE'
  | 'CUSTOMER_STATEMENT'
  | 'PRODUCTION_STATS'
  | 'GENERAL'

export interface AIExperiment {
  id: string
  name: string
  description: string
  category: 'quick-actions' | 'insights' | 'planning'
  status: 'experimental'
  href: string
}
