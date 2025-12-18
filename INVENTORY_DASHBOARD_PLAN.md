# Inventory Dashboard Implementation Plan

## 🎯 Overview
Build an admin-only Inventory Dashboard featuring:
- Inventory Movement & Turnover Analytics
- Trends & Forecasting
- Reorder Recommendations
- Top Customers & Vendors Analysis
- Bucket Type Performance Metrics

---

## 📋 Feature Requirements

### 1. Overview Cards (Time-filtered)
- **Total Buckets Stocked** (with % change from previous period)
- **Total Buckets Sold** (with % change from previous period)
- **Inventory Turnover Rate** (Sold / Average Stock Level)
- **Current Stock Value** (Total buckets across all warehouses)

### 2. Movement Trends Chart
- Line chart showing Stock IN vs Stock OUT over time
- Granularity based on selected time period (daily, weekly, monthly)
- Identify peak stocking/selling periods
- Month-over-month or day-over-day growth indicators

### 3. Forecast Chart
- Project future sales for next 30/60/90 days
- Based on historical average consumption rate
- Simple moving average or linear regression
- Visual indicator showing actual vs projected trend line

### 4. Bucket Type Performance Table
Columns:
- Bucket Type
- Total Stocked (in period)
- Total Sold (in period)
- Current Stock Level
- Turnover Rate (times sold per period)
- Average Days to Sell
- Status Badge (Fast-moving ⚡ / Moderate ⏱️ / Slow-moving 🐌)

Color coding:
- Green: Turnover > 2x per month (fast-moving)
- Yellow: Turnover 0.5-2x per month (moderate)
- Red: Turnover < 0.5x per month (slow-moving)

### 5. Reorder Recommendation Table
Columns:
- Bucket Type
- Current Stock (across all warehouses)
- Average Daily Consumption (based on last 30 days)
- Days Until Stockout (Stock / Daily Consumption)
- Reorder Status (🔴 Urgent / 🟡 Soon / 🟢 Sufficient)
- Recommended Order Quantity (to reach 60 days of supply)

Logic:
- 🔴 Urgent: < 14 days until stockout
- 🟡 Soon: 14-30 days until stockout
- 🟢 Sufficient: > 30 days of supply

### 6. Top 10 Customers & Vendors
Two sections:
- **Top Buyers** (highest quantity sold to)
  - Name, Total Quantity, Transaction Count, Last Purchase Date
- **Top Suppliers** (highest quantity received from)
  - Name, Total Quantity, Transaction Count, Last Supply Date

### 7. Time Period Filters
- Daily (last 7 days, last 30 days, custom date)
- Monthly (current month, last 3 months, last 6 months, last 12 months)
- All Time

---

## 🗂️ File Structure

```
/src/app/inventory-dashboard/
├── page.tsx                           # Main dashboard page
├── components/
│   ├── OverviewCards.tsx             # 4 metric cards
│   ├── MovementTrendsChart.tsx       # Line chart (Stock IN/OUT)
│   ├── ForecastChart.tsx             # Forecast visualization
│   ├── BucketPerformanceTable.tsx    # Performance metrics table
│   ├── ReorderRecommendationTable.tsx # Reorder suggestions
│   └── TopCustomersVendors.tsx       # Top 10 lists

/src/app/api/inventory-dashboard/
└── route.ts                           # API endpoint for data aggregation

/src/types/
└── index.ts                           # Add InventoryDashboard types
```

---

## 🔧 Implementation Steps

### Step 1: Type Definitions
**File:** `/src/types/index.ts`

Add interfaces:
```typescript
// Time period filter options
type TimePeriodView = 'daily' | 'monthly' | 'alltime'
type DailyPeriod = '7days' | '30days' | 'custom'
type MonthlyPeriod = 'current' | '3months' | '6months' | '12months'

// Overview metrics
interface InventoryOverviewMetrics {
  totalStocked: number
  totalSold: number
  stockedChange: number // % change from previous period
  soldChange: number
  turnoverRate: number
  currentStockValue: number // Total buckets in stock
}

// Movement trend data point
interface MovementTrendDataPoint {
  date: string // formatted date
  stocked: number
  sold: number
  net: number // stocked - sold
}

// Forecast data point
interface ForecastDataPoint {
  date: string
  actual?: number // if historical
  projected?: number // if forecast
}

// Bucket performance
interface BucketPerformance {
  bucketType: BucketType
  totalStocked: number
  totalSold: number
  currentStock: number
  turnoverRate: number
  avgDaysToSell: number | null
  status: 'fast' | 'moderate' | 'slow'
}

// Reorder recommendation
interface ReorderRecommendation {
  bucketType: BucketType
  currentStock: number
  avgDailyConsumption: number
  daysUntilStockout: number | null // null if no consumption
  status: 'urgent' | 'soon' | 'sufficient' | 'nodata'
  recommendedOrderQty: number
}

// Top customer/vendor
interface TopEntity {
  name: string
  totalQuantity: number
  transactionCount: number
  lastTransactionDate: string
}

// Complete dashboard response
interface InventoryDashboardResponse {
  success: boolean
  data: {
    overview: InventoryOverviewMetrics
    movementTrends: MovementTrendDataPoint[]
    forecast: ForecastDataPoint[]
    bucketPerformance: BucketPerformance[]
    reorderRecommendations: ReorderRecommendation[]
    topBuyers: TopEntity[]
    topSuppliers: TopEntity[]
  }
  message?: string
}
```

---

### Step 2: API Endpoint - Data Aggregation
**File:** `/src/app/api/inventory-dashboard/route.ts`

**Query Parameters:**
- `view`: 'daily' | 'monthly' | 'alltime'
- `period`: '7days' | '30days' | 'current' | '3months' | '6months' | '12months'
- `startDate`: ISO date string (for custom range)
- `endDate`: ISO date string (for custom range)

**Data Calculations:**

1. **Overview Metrics:**
   - Query InventoryTransaction filtered by date range
   - Sum quantity where action = 'STOCK' (totalStocked)
   - Sum ABS(quantity) where action = 'SELL' (totalSold)
   - Calculate % change by comparing to previous period
   - Turnover rate = totalSold / average stock level
   - Current stock = latest runningTotal sum across all bucket types

2. **Movement Trends:**
   - Group transactions by date (or month if monthly view)
   - Aggregate stocked vs sold per time unit
   - Return array of data points for charting

3. **Forecast:**
   - Calculate average daily/monthly sales for last 30/90 days
   - Project forward 30/60/90 days using moving average
   - Return historical + projected data points

4. **Bucket Performance:**
   - Group by bucketType
   - Calculate metrics per type
   - Determine status based on turnover thresholds
   - Sort by turnover rate descending

5. **Reorder Recommendations:**
   - For each bucket type:
     - Get current stock (sum of latest runningTotal per warehouse)
     - Calculate avg daily consumption (last 30 days SELL transactions / 30)
     - Days until stockout = currentStock / avgDailyConsumption
     - Recommended order = (60 * avgDailyConsumption) - currentStock
   - Sort by daysUntilStockout ascending (most urgent first)

6. **Top Customers & Vendors:**
   - Group by buyerSeller and action
   - action = 'SELL' → customers (buyers)
   - action = 'STOCK' → vendors (suppliers)
   - Aggregate quantity and count transactions
   - Sort by totalQuantity descending
   - Return top 10 each

**Database Optimization:**
- Use Prisma aggregations and groupBy
- Single query per metric where possible
- Index usage on date, warehouse, bucketType, action columns

**Admin Check:**
```typescript
const session = await getSession()
if (session?.role !== 'ADMIN') {
  return NextResponse.json(
    { success: false, message: 'Admin access required' },
    { status: 403 }
  )
}
```

---

### Step 3: Main Dashboard Page
**File:** `/src/app/inventory-dashboard/page.tsx`

**Structure:**
```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { ProtectedLayout } from '@/components/Layout/ProtectedLayout'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'

// Components
import OverviewCards from './components/OverviewCards'
import MovementTrendsChart from './components/MovementTrendsChart'
import ForecastChart from './components/ForecastChart'
import BucketPerformanceTable from './components/BucketPerformanceTable'
import ReorderRecommendationTable from './components/ReorderRecommendationTable'
import TopCustomersVendors from './components/TopCustomersVendors'

export default function InventoryDashboardPage() {
  const { role } = useAuthStore()
  const router = useRouter()

  // State
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<InventoryDashboardResponse | null>(null)
  const [view, setView] = useState<TimePeriodView>('monthly')
  const [period, setPeriod] = useState<string>('3months')
  const [dateRange, setDateRange] = useState<{ start: Date | null, end: Date | null }>({
    start: null,
    end: null
  })

  // Admin check
  useEffect(() => {
    if (role !== 'ADMIN') {
      router.push('/inventory')
    }
  }, [role, router])

  // Fetch data
  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        view,
        period,
        ...(dateRange.start && { startDate: dateRange.start.toISOString() }),
        ...(dateRange.end && { endDate: dateRange.end.toISOString() })
      })

      const response = await fetch(`/api/inventory-dashboard?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result)
      } else {
        console.error('Failed to fetch dashboard data:', result.message)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [view, period, dateRange])

  useEffect(() => {
    if (role === 'ADMIN') {
      fetchDashboardData()
    }
  }, [fetchDashboardData, role])

  if (loading) return <PageLoader />

  return (
    <ProtectedLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Inventory Dashboard</h1>
            <p className="text-muted-foreground">Analytics, trends, and recommendations</p>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {/* View selector: Daily | Monthly | All Time */}
            {/* Period selector based on view */}
            {/* Date range picker for custom */}
          </div>
        </div>

        {/* Overview Cards */}
        <OverviewCards data={data?.data.overview} />

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MovementTrendsChart data={data?.data.movementTrends} />
          <ForecastChart data={data?.data.forecast} />
        </div>

        {/* Reorder Recommendations */}
        <ReorderRecommendationTable data={data?.data.reorderRecommendations} />

        {/* Bucket Performance */}
        <BucketPerformanceTable data={data?.data.bucketPerformance} />

        {/* Top Customers & Vendors */}
        <TopCustomersVendors
          topBuyers={data?.data.topBuyers}
          topSuppliers={data?.data.topSuppliers}
        />
      </div>
    </ProtectedLayout>
  )
}
```

---

### Step 4: Component - Overview Cards
**File:** `/src/app/inventory-dashboard/components/OverviewCards.tsx`

**Layout:** 4 cards in responsive grid

**Card Structure:**
- Icon (from lucide-react)
- Label
- Value (large, formatted number)
- Change indicator (↑ +12.5% or ↓ -5.3% with color)

**Cards:**
1. Total Stocked (🔵 blue, PackagePlus icon)
2. Total Sold (🟢 green, TrendingUp icon)
3. Turnover Rate (🟣 purple, Repeat icon)
4. Current Stock (🟡 amber, Package icon)

---

### Step 5: Component - Movement Trends Chart
**File:** `/src/app/inventory-dashboard/components/MovementTrendsChart.tsx`

**Chart Type:** Recharts LineChart

**Features:**
- Responsive container (height: 400px)
- X-axis: Date (formatted with date-fns)
- Y-axis: Quantity
- Lines:
  - Stocked (blue #3b82f6)
  - Sold (green #22c55e)
  - Net (dashed gray #6b7280)
- Tooltip with formatted values
- Legend
- Grid lines

---

### Step 6: Component - Forecast Chart
**File:** `/src/app/inventory-dashboard/components/ForecastChart.tsx`

**Chart Type:** Recharts AreaChart or LineChart

**Features:**
- X-axis: Date
- Y-axis: Quantity
- Areas/Lines:
  - Actual sales (solid green)
  - Projected sales (dashed orange with shaded area)
- Reference line separating historical from forecast (vertical dotted line)
- Tooltip showing date + actual/projected value
- Legend: "Historical" | "Forecast"

---

### Step 7: Component - Bucket Performance Table
**File:** `/src/app/inventory-dashboard/components/BucketPerformanceTable.tsx`

**Table Features:**
- Sortable columns
- Color-coded status badges
- Responsive (horizontal scroll on mobile)

**Columns:**
1. Bucket Type (with bucket icon)
2. Stocked (formatted number)
3. Sold (formatted number)
4. Current Stock (formatted number)
5. Turnover Rate (X.XX with "x/month" suffix)
6. Avg Days to Sell (number or "N/A")
7. Status (badge: ⚡ Fast / ⏱️ Moderate / 🐌 Slow)

**Status Colors:**
- Fast: green badge
- Moderate: yellow badge
- Slow: red badge

---

### Step 8: Component - Reorder Recommendation Table
**File:** `/src/app/inventory-dashboard/components/ReorderRecommendationTable.tsx`

**Table Features:**
- Priority sorting (urgent first)
- Status indicators with icons
- Actionable recommendations

**Columns:**
1. Bucket Type
2. Current Stock
3. Daily Consumption (avg)
4. Days Until Stockout (with color coding)
5. Status (🔴 Urgent / 🟡 Soon / 🟢 Sufficient / ⚪ No Data)
6. Recommended Order Qty

**Status Colors:**
- 🔴 Urgent (< 14 days): red background
- 🟡 Soon (14-30 days): yellow background
- 🟢 Sufficient (> 30 days): green background
- ⚪ No Data: gray

**Additional Feature:**
- "Export to CSV" button to download recommendations
- Optional: "Create Purchase Order" button (future enhancement)

---

### Step 9: Component - Top Customers & Vendors
**File:** `/src/app/inventory-dashboard/components/TopCustomersVendors.tsx`

**Layout:** Two side-by-side tables (responsive: stack on mobile)

**Table 1: Top 10 Buyers**
Columns:
- Rank (#1, #2, etc.)
- Customer Name
- Total Quantity
- Transactions
- Last Purchase (formatted date)

**Table 2: Top 10 Suppliers**
Columns:
- Rank
- Supplier Name
- Total Quantity
- Transactions
- Last Supply (formatted date)

**Styling:**
- Top 3 get medal icons (🥇 🥈 🥉)
- Alternating row colors for readability

---

### Step 10: Navigation Integration
**File:** `/src/components/Layout/Header.tsx`

**Change:**
Add to `navItems` array (after 'Dashboard' item):
```typescript
{
  href: '/inventory-dashboard',
  label: 'Inventory Dashboard',
  roles: ['ADMIN']
}
```

**Position:** Between "Dashboard" and "Statements" for logical grouping

---

### Step 11: Middleware Protection
**File:** `/src/middleware.ts`

**Verify admin protection already covers:**
```typescript
if (path.startsWith('/inventory-dashboard')) {
  if (role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/inventory', request.url))
  }
}
```

**Note:** May already be covered by admin path checks, verify and add if needed.

---

## 🎨 UI/UX Considerations

### Design Consistency
- Follow existing dashboard patterns from `/src/app/dashboard`
- Use shadcn/ui components (Card, Table, Button, Select, etc.)
- Maintain color scheme from theme
- Responsive design (mobile-first)

### Loading States
- Skeleton loaders for cards
- Spinner for charts
- Progressive loading (show cached data while refetching)

### Error Handling
- API error messages
- Empty state illustrations (no data for period)
- Retry button on failures

### Performance
- Debounce filter changes
- Optimize Prisma queries with proper includes/selects
- Consider caching frequently accessed aggregations
- Lazy load chart libraries

### Accessibility
- Proper ARIA labels
- Keyboard navigation
- Color contrast compliance
- Screen reader support for charts (data table fallback)

---

## 🧪 Testing Checklist

### Functional Testing
- [ ] Admin-only access enforced (redirect non-admin)
- [ ] All time period filters work correctly
- [ ] Date range picker handles edge cases
- [ ] Charts render with data
- [ ] Empty states display when no data
- [ ] Sorting works on tables
- [ ] Export CSV generates correct file
- [ ] Mobile responsive layout works

### Data Accuracy
- [ ] Turnover rate calculation correct
- [ ] Forecast algorithm reasonable
- [ ] Reorder recommendations accurate
- [ ] Top customers/vendors correctly ranked
- [ ] Percentage changes calculated properly
- [ ] Running totals match inventory page

### Performance
- [ ] Page loads in < 2 seconds
- [ ] API response time < 1 second
- [ ] No unnecessary re-renders
- [ ] Charts render smoothly

### Edge Cases
- [ ] No transactions in period (empty state)
- [ ] Single bucket type only
- [ ] Zero consumption (reorder recommendations)
- [ ] Future dates (shouldn't crash)
- [ ] Very large datasets (pagination if needed)

---

## 📊 Database Query Optimization

### Indexes to Verify (should already exist)
```prisma
@@index([date])
@@index([warehouse])
@@index([bucketType])
@@index([action])
@@index([buyerSeller])
```

### Query Patterns
1. **Date range filtering:** Always filter on `date` column first
2. **Aggregations:** Use Prisma's `groupBy` and `aggregate`
3. **Running totals:** Order by date DESC and take first for latest stock
4. **Avoid N+1:** Batch queries where possible

### Example Optimized Query (Reorder Recommendations)
```typescript
// Get latest stock for all bucket types in one query
const latestStocks = await prisma.inventoryTransaction.groupBy({
  by: ['bucketType', 'warehouse'],
  _max: { createdAt: true },
  orderBy: { createdAt: 'desc' }
})

// Get consumption data for last 30 days
const thirtyDaysAgo = subDays(new Date(), 30)
const consumption = await prisma.inventoryTransaction.groupBy({
  by: ['bucketType'],
  where: {
    action: 'SELL',
    date: { gte: thirtyDaysAgo }
  },
  _sum: { quantity: true },
  _count: true
})

// Combine and calculate in memory (faster than multiple queries)
```

---

## 🚀 Deployment Checklist

- [ ] All TypeScript types added
- [ ] API endpoint tested with Postman/Thunder Client
- [ ] Components render correctly
- [ ] Navigation link added
- [ ] Middleware protection verified
- [ ] No console errors
- [ ] Mobile responsive tested
- [ ] Admin access tested
- [ ] Non-admin redirect tested
- [ ] Production build succeeds (`npm run build`)
- [ ] Database migrations run (if any schema changes)

---

## 📈 Future Enhancements (Post-MVP)

1. **Auto-refresh:** Refresh data every 5 minutes (like daily-report)
2. **Export functionality:** PDF reports, Excel export
3. **Email alerts:** Send reorder alerts to admin email
4. **Predictive analytics:** ML-based forecasting (if needed)
5. **Warehouse-specific filtering:** View per warehouse
6. **Comparison mode:** Compare two time periods side-by-side
7. **Goals/Targets:** Set sales targets and track progress
8. **Integration:** Connect to purchase order system
9. **Custom alerts:** User-defined thresholds for reorder points
10. **Historical snapshots:** Save monthly reports for comparison

---

## 🔢 Calculation Formulas Reference

### Turnover Rate
```
Turnover Rate = Total Sold / Average Stock Level
Average Stock Level = (Beginning Stock + Ending Stock) / 2
```

### Average Days to Sell
```
Avg Days to Sell = Period Length (days) / Turnover Rate
Example: 30 days / 2 = 15 days average to sell
```

### Days Until Stockout
```
Days Until Stockout = Current Stock / Average Daily Consumption
Average Daily Consumption = Total Sold (last 30 days) / 30
```

### Recommended Order Quantity
```
Target Days of Supply = 60 days
Recommended Order Qty = (Target Days * Daily Consumption) - Current Stock
If result < 0, recommend 0 (already overstocked)
```

### Forecast (Simple Moving Average)
```
Next Period Forecast = Average(Last N Periods)
Example: Forecast for March = Average(Dec, Jan, Feb)
```

### Percentage Change
```
% Change = ((Current Period - Previous Period) / Previous Period) * 100
```

---

## 📝 Implementation Order

1. ✅ **Types** → Defines data structures
2. ✅ **API Endpoint** → Core data logic
3. ✅ **Overview Cards** → Quick visual wins
4. ✅ **Movement Trends Chart** → Primary visualization
5. ✅ **Reorder Table** → High business value
6. ✅ **Bucket Performance Table** → Detailed insights
7. ✅ **Forecast Chart** → Predictive value
8. ✅ **Top Customers/Vendors** → Relationship insights
9. ✅ **Main Page** → Orchestrates all components
10. ✅ **Navigation** → Make it accessible

---

## 🎯 Success Metrics

**Technical:**
- Page load < 2 seconds
- API response < 1 second
- Zero TypeScript errors
- 100% mobile responsive

**Business:**
- Admin can identify top-selling products at a glance
- Reorder recommendations prevent stockouts
- Trends reveal seasonal patterns
- Forecast helps procurement planning

---

## 📞 Questions to Clarify Before Implementation

1. **Pricing:** Do we have purchase/selling prices for buckets? (affects profit calculations)
2. **Reorder thresholds:** Is 14/30/60 days appropriate, or different values?
3. **Forecast period:** 30/60/90 days or customizable?
4. **Data retention:** How far back should "All Time" go?
5. **Refresh rate:** Auto-refresh like daily-report (5 min) or manual only?
6. **Export format:** CSV, PDF, or both?
7. **Mobile priority:** Desktop-first or mobile-first design?

---

**Estimated Complexity:** Medium-High
**Estimated Implementation Time:** 6-8 hours (full-stack)
**Dependencies:** None (all existing tech stack)

---

_Plan created: 2025-12-18_
_Ready for implementation upon approval_
