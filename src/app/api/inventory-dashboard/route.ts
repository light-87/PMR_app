import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import {
  format,
  subDays,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  eachMonthOfInterval,
  addDays,
  addMonths
} from 'date-fns'
import type {
  InventoryDashboardData,
  MovementTrendDataPoint,
  ForecastDataPoint,
  BucketPerformance,
  ReorderRecommendation,
  TopEntity,
  InventoryOverviewMetrics,
  BucketType,
} from '@/types'

export const dynamic = 'force-dynamic'

// GET - Fetch inventory dashboard analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admin can view inventory dashboard
    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const view = searchParams.get('view') || 'monthly'
    const period = searchParams.get('period') || '3months'
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    // Determine date range based on view and period
    let startDate: Date
    let endDate: Date
    let previousPeriodStart: Date
    let previousPeriodEnd: Date

    const now = new Date()

    if (startDateParam && endDateParam) {
      // Custom date range
      startDate = startOfDay(new Date(startDateParam))
      endDate = endOfDay(new Date(endDateParam))
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      previousPeriodEnd = subDays(startDate, 1)
      previousPeriodStart = subDays(previousPeriodEnd, daysDiff)
    } else if (view === 'daily') {
      if (period === '7days') {
        endDate = endOfDay(now)
        startDate = startOfDay(subDays(now, 6))
        previousPeriodEnd = subDays(startDate, 1)
        previousPeriodStart = subDays(previousPeriodEnd, 6)
      } else if (period === '30days') {
        endDate = endOfDay(now)
        startDate = startOfDay(subDays(now, 29))
        previousPeriodEnd = subDays(startDate, 1)
        previousPeriodStart = subDays(previousPeriodEnd, 29)
      } else {
        // Default to 7 days
        endDate = endOfDay(now)
        startDate = startOfDay(subDays(now, 6))
        previousPeriodEnd = subDays(startDate, 1)
        previousPeriodStart = subDays(previousPeriodEnd, 6)
      }
    } else if (view === 'monthly') {
      if (period === 'current') {
        startDate = startOfMonth(now)
        endDate = endOfDay(now)
        previousPeriodEnd = subDays(startDate, 1)
        previousPeriodStart = startOfMonth(previousPeriodEnd)
      } else if (period === '3months') {
        endDate = endOfDay(now)
        startDate = startOfDay(subMonths(now, 3))
        previousPeriodEnd = subDays(startDate, 1)
        previousPeriodStart = subMonths(previousPeriodEnd, 3)
      } else if (period === '6months') {
        endDate = endOfDay(now)
        startDate = startOfDay(subMonths(now, 6))
        previousPeriodEnd = subDays(startDate, 1)
        previousPeriodStart = subMonths(previousPeriodEnd, 6)
      } else if (period === '12months') {
        endDate = endOfDay(now)
        startDate = startOfDay(subMonths(now, 12))
        previousPeriodEnd = subDays(startDate, 1)
        previousPeriodStart = subMonths(previousPeriodEnd, 12)
      } else {
        // Default to 3 months
        endDate = endOfDay(now)
        startDate = startOfDay(subMonths(now, 3))
        previousPeriodEnd = subDays(startDate, 1)
        previousPeriodStart = subMonths(previousPeriodEnd, 3)
      }
    } else {
      // All time
      const earliest = await prisma.inventoryTransaction.findFirst({
        orderBy: { date: 'asc' },
        select: { date: true },
      })
      const latest = await prisma.inventoryTransaction.findFirst({
        orderBy: { date: 'desc' },
        select: { date: true },
      })
      startDate = earliest?.date || now
      endDate = latest?.date || now
      // For all-time, compare with half the total period
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const halfPeriod = Math.floor(totalDays / 2)
      previousPeriodEnd = subDays(endDate, halfPeriod)
      previousPeriodStart = startDate
    }

    // Fetch transactions for current period
    const transactions = await prisma.inventoryTransaction.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    })

    // Fetch transactions for previous period (for comparison)
    const previousTransactions = await prisma.inventoryTransaction.findMany({
      where: {
        date: {
          gte: previousPeriodStart,
          lte: previousPeriodEnd,
        },
      },
    })

    // Calculate overview metrics
    const overview = calculateOverviewMetrics(transactions, previousTransactions)

    // Calculate movement trends
    const movementTrends = calculateMovementTrends(transactions, startDate, endDate, view)

    // Calculate forecast
    const forecast = calculateForecast(transactions, endDate, view)

    // Calculate bucket performance
    const bucketPerformance = await calculateBucketPerformance(transactions, startDate, endDate)

    // Calculate reorder recommendations
    const reorderRecommendations = await calculateReorderRecommendations()

    // Get top buyers and suppliers
    const { topBuyers, topSuppliers } = calculateTopEntities(transactions)

    const data: InventoryDashboardData = {
      overview,
      movementTrends,
      forecast,
      bucketPerformance,
      reorderRecommendations,
      topBuyers,
      topSuppliers,
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Error fetching inventory dashboard:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}

// Helper function: Calculate overview metrics
function calculateOverviewMetrics(
  currentTransactions: any[],
  previousTransactions: any[]
): InventoryOverviewMetrics {
  let totalStocked = 0
  let totalSold = 0
  let prevTotalStocked = 0
  let prevTotalSold = 0

  currentTransactions.forEach((t) => {
    const qty = Math.abs(Number(t.quantity))
    if (t.action === 'STOCK') {
      totalStocked += qty
    } else if (t.action === 'SELL') {
      totalSold += qty
    }
  })

  previousTransactions.forEach((t) => {
    const qty = Math.abs(Number(t.quantity))
    if (t.action === 'STOCK') {
      prevTotalStocked += qty
    } else if (t.action === 'SELL') {
      prevTotalSold += qty
    }
  })

  // Calculate percentage changes
  const stockedChange = prevTotalStocked > 0
    ? ((totalStocked - prevTotalStocked) / prevTotalStocked) * 100
    : 0

  const soldChange = prevTotalSold > 0
    ? ((totalSold - prevTotalSold) / prevTotalSold) * 100
    : 0

  // Calculate turnover rate (sold / average stock)
  const avgStock = (totalStocked + totalSold) / 2
  const turnoverRate = avgStock > 0 ? totalSold / avgStock : 0

  // Get current stock value (sum of all running totals)
  // We'll get this from the latest transaction per bucket type
  const currentStockValue = currentTransactions.length > 0
    ? currentTransactions[currentTransactions.length - 1]?.runningTotal || 0
    : 0

  return {
    totalStocked,
    totalSold,
    stockedChange: Math.round(stockedChange * 10) / 10,
    soldChange: Math.round(soldChange * 10) / 10,
    turnoverRate: Math.round(turnoverRate * 100) / 100,
    currentStockValue,
  }
}

// Helper function: Calculate movement trends
function calculateMovementTrends(
  transactions: any[],
  startDate: Date,
  endDate: Date,
  view: string
): MovementTrendDataPoint[] {
  const trends: MovementTrendDataPoint[] = []

  if (view === 'monthly' || view === 'alltime') {
    // Group by month
    const months = eachMonthOfInterval({ start: startDate, end: endDate })

    months.forEach((month) => {
      const monthStart = startOfMonth(month)
      const monthEnd = endOfMonth(month)

      let stocked = 0
      let sold = 0

      transactions.forEach((t) => {
        const tDate = new Date(t.date)
        if (tDate >= monthStart && tDate <= monthEnd) {
          const qty = Math.abs(Number(t.quantity))
          if (t.action === 'STOCK') {
            stocked += qty
          } else if (t.action === 'SELL') {
            sold += qty
          }
        }
      })

      trends.push({
        date: format(month, 'MMM yyyy'),
        stocked,
        sold,
        net: stocked - sold,
      })
    })
  } else {
    // Group by day
    const days = eachDayOfInterval({ start: startDate, end: endDate })

    days.forEach((day) => {
      const dayStart = startOfDay(day)
      const dayEnd = endOfDay(day)

      let stocked = 0
      let sold = 0

      transactions.forEach((t) => {
        const tDate = new Date(t.date)
        if (tDate >= dayStart && tDate <= dayEnd) {
          const qty = Math.abs(Number(t.quantity))
          if (t.action === 'STOCK') {
            stocked += qty
          } else if (t.action === 'SELL') {
            sold += qty
          }
        }
      })

      trends.push({
        date: format(day, 'MMM dd'),
        stocked,
        sold,
        net: stocked - sold,
      })
    })
  }

  return trends
}

// Helper function: Calculate forecast
function calculateForecast(
  transactions: any[],
  endDate: Date,
  view: string
): ForecastDataPoint[] {
  const forecast: ForecastDataPoint[] = []

  // Calculate average daily/monthly sales for the period
  const salesByPeriod: { [key: string]: number } = {}

  transactions.forEach((t) => {
    if (t.action === 'SELL') {
      const periodKey = view === 'daily'
        ? format(new Date(t.date), 'yyyy-MM-dd')
        : format(new Date(t.date), 'yyyy-MM')

      if (!salesByPeriod[periodKey]) {
        salesByPeriod[periodKey] = 0
      }
      salesByPeriod[periodKey] += Math.abs(Number(t.quantity))
    }
  })

  const periods = Object.keys(salesByPeriod)
  const avgSales = periods.length > 0
    ? Object.values(salesByPeriod).reduce((sum, val) => sum + val, 0) / periods.length
    : 0

  // Project forward 30/60/90 days or 3 months
  const forecastPeriods = view === 'daily' ? 30 : 3

  for (let i = 1; i <= forecastPeriods; i++) {
    const forecastDate = view === 'daily'
      ? addDays(endDate, i)
      : addMonths(endDate, i)

    forecast.push({
      date: view === 'daily'
        ? format(forecastDate, 'MMM dd')
        : format(forecastDate, 'MMM yyyy'),
      projected: Math.round(avgSales),
    })
  }

  // Add last few actual data points for context
  const recentPeriods = periods.slice(-5)
  recentPeriods.forEach((periodKey) => {
    const date = new Date(periodKey)
    forecast.unshift({
      date: view === 'daily'
        ? format(date, 'MMM dd')
        : format(date, 'MMM yyyy'),
      actual: salesByPeriod[periodKey],
    })
  })

  return forecast
}

// Helper function: Calculate bucket performance
async function calculateBucketPerformance(
  transactions: any[],
  startDate: Date,
  endDate: Date
): Promise<BucketPerformance[]> {
  const bucketStats: { [key: string]: any } = {}

  // Aggregate by bucket type
  transactions.forEach((t) => {
    const bucketType = t.bucketType as BucketType
    if (!bucketStats[bucketType]) {
      bucketStats[bucketType] = {
        totalStocked: 0,
        totalSold: 0,
        currentStock: 0,
      }
    }

    const qty = Math.abs(Number(t.quantity))
    if (t.action === 'STOCK') {
      bucketStats[bucketType].totalStocked += qty
    } else if (t.action === 'SELL') {
      bucketStats[bucketType].totalSold += qty
    }
    bucketStats[bucketType].currentStock = Number(t.runningTotal) || 0
  })

  // Get latest running total for each bucket type across all warehouses
  const latestStocks = await prisma.inventoryTransaction.groupBy({
    by: ['bucketType', 'warehouse'],
    _max: {
      date: true,
    },
  })

  const currentStocks: { [key: string]: number } = {}
  for (const stock of latestStocks) {
    if (!stock._max.date) continue

    const latest = await prisma.inventoryTransaction.findFirst({
      where: {
        bucketType: stock.bucketType,
        warehouse: stock.warehouse,
        date: stock._max.date,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (latest) {
      if (!currentStocks[stock.bucketType]) {
        currentStocks[stock.bucketType] = 0
      }
      currentStocks[stock.bucketType] += Number(latest.runningTotal) || 0
    }
  }

  const performance: BucketPerformance[] = []

  for (const [bucketType, stats] of Object.entries(bucketStats)) {
    const avgStock = (stats.totalStocked + (currentStocks[bucketType] || 0)) / 2
    const turnoverRate = avgStock > 0 ? stats.totalSold / avgStock : 0

    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const avgDaysToSell = turnoverRate > 0 ? daysDiff / turnoverRate : null

    let status: 'fast' | 'moderate' | 'slow' = 'moderate'
    const monthlyTurnover = (turnoverRate / daysDiff) * 30
    if (monthlyTurnover > 2) status = 'fast'
    else if (monthlyTurnover < 0.5) status = 'slow'

    performance.push({
      bucketType: bucketType as BucketType,
      totalStocked: stats.totalStocked,
      totalSold: stats.totalSold,
      currentStock: currentStocks[bucketType] || 0,
      turnoverRate: Math.round(turnoverRate * 100) / 100,
      avgDaysToSell: avgDaysToSell ? Math.round(avgDaysToSell) : null,
      status,
    })
  }

  return performance.sort((a, b) => b.turnoverRate - a.turnoverRate)
}

// Helper function: Calculate reorder recommendations
async function calculateReorderRecommendations(): Promise<ReorderRecommendation[]> {
  const recommendations: ReorderRecommendation[] = []

  // Get current stock for all bucket types
  const latestStocks = await prisma.inventoryTransaction.groupBy({
    by: ['bucketType', 'warehouse'],
    _max: {
      date: true,
    },
  })

  const currentStocks: { [key: string]: number } = {}
  for (const stock of latestStocks) {
    if (!stock._max.date) continue

    const latest = await prisma.inventoryTransaction.findFirst({
      where: {
        bucketType: stock.bucketType,
        warehouse: stock.warehouse,
        date: stock._max.date,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (latest) {
      if (!currentStocks[stock.bucketType]) {
        currentStocks[stock.bucketType] = 0
      }
      currentStocks[stock.bucketType] += Number(latest.runningTotal) || 0
    }
  }

  // Calculate consumption for last 30 days
  const thirtyDaysAgo = subDays(new Date(), 30)
  const recentSales = await prisma.inventoryTransaction.groupBy({
    by: ['bucketType'],
    where: {
      action: 'SELL',
      date: {
        gte: thirtyDaysAgo,
      },
    },
    _sum: {
      quantity: true,
    },
  })

  const consumption: { [key: string]: number } = {}
  recentSales.forEach((sale) => {
    consumption[sale.bucketType] = Math.abs(Number(sale._sum.quantity) || 0)
  })

  // Generate recommendations for all bucket types
  const allBucketTypes = Object.keys(currentStocks)

  for (const bucketType of allBucketTypes) {
    const currentStock = currentStocks[bucketType] || 0
    const totalConsumption = consumption[bucketType] || 0
    const avgDailyConsumption = totalConsumption / 30

    let daysUntilStockout: number | null = null
    let status: 'urgent' | 'soon' | 'sufficient' | 'nodata' = 'nodata'
    let recommendedOrderQty = 0

    if (avgDailyConsumption > 0) {
      daysUntilStockout = Math.floor(currentStock / avgDailyConsumption)

      if (daysUntilStockout < 14) {
        status = 'urgent'
      } else if (daysUntilStockout < 30) {
        status = 'soon'
      } else {
        status = 'sufficient'
      }

      // Recommend ordering to reach 60 days of supply
      const targetStock = avgDailyConsumption * 60
      recommendedOrderQty = Math.max(0, Math.ceil(targetStock - currentStock))
    }

    recommendations.push({
      bucketType: bucketType as BucketType,
      currentStock,
      avgDailyConsumption: Math.round(avgDailyConsumption * 10) / 10,
      daysUntilStockout,
      status,
      recommendedOrderQty,
    })
  }

  // Sort by urgency (urgent first, then soon, then sufficient, then nodata)
  const statusOrder = { urgent: 0, soon: 1, sufficient: 2, nodata: 3 }
  return recommendations.sort((a, b) => statusOrder[a.status] - statusOrder[b.status])
}

// Helper function: Calculate top entities (buyers and suppliers)
function calculateTopEntities(transactions: any[]): {
  topBuyers: TopEntity[]
  topSuppliers: TopEntity[]
} {
  const buyerStats: { [key: string]: { qty: number; count: number; lastDate: Date } } = {}
  const supplierStats: { [key: string]: { qty: number; count: number; lastDate: Date } } = {}

  transactions.forEach((t) => {
    const name = t.buyerSeller
    const qty = Math.abs(Number(t.quantity))
    const date = new Date(t.date)

    if (t.action === 'SELL') {
      if (!buyerStats[name]) {
        buyerStats[name] = { qty: 0, count: 0, lastDate: date }
      }
      buyerStats[name].qty += qty
      buyerStats[name].count += 1
      if (date > buyerStats[name].lastDate) {
        buyerStats[name].lastDate = date
      }
    } else if (t.action === 'STOCK') {
      if (!supplierStats[name]) {
        supplierStats[name] = { qty: 0, count: 0, lastDate: date }
      }
      supplierStats[name].qty += qty
      supplierStats[name].count += 1
      if (date > supplierStats[name].lastDate) {
        supplierStats[name].lastDate = date
      }
    }
  })

  const topBuyers: TopEntity[] = Object.entries(buyerStats)
    .map(([name, stats]) => ({
      name,
      totalQuantity: stats.qty,
      transactionCount: stats.count,
      lastTransactionDate: format(stats.lastDate, 'MMM dd, yyyy'),
    }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, 10)

  const topSuppliers: TopEntity[] = Object.entries(supplierStats)
    .map(([name, stats]) => ({
      name,
      totalQuantity: stats.qty,
      transactionCount: stats.count,
      lastTransactionDate: format(stats.lastDate, 'MMM dd, yyyy'),
    }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, 10)

  return { topBuyers, topSuppliers }
}
