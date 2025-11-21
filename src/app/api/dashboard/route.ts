import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { format, subMonths, startOfYear, endOfYear } from 'date-fns'
import type { ExpenseAccount } from '@/types'

export const dynamic = 'force-dynamic'

// GET - Fetch dashboard analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admin can view dashboard
    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const view = searchParams.get('view') || 'year'
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const banksParam = searchParams.get('banks')
    const selectedBanks = banksParam ? banksParam.split(',') as ExpenseAccount[] : null

    // Determine date range based on view
    let startDate: Date
    let endDate: Date

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam)
      endDate = new Date(endDateParam)
      endDate.setHours(23, 59, 59, 999)
    } else if (view === 'last12months') {
      endDate = new Date()
      startDate = subMonths(endDate, 12)
    } else if (view === 'alltime') {
      // Get earliest and latest dates from data
      const earliest = await prisma.expenseTransaction.findFirst({
        orderBy: { date: 'asc' },
        select: { date: true },
      })
      const latest = await prisma.expenseTransaction.findFirst({
        orderBy: { date: 'desc' },
        select: { date: true },
      })
      startDate = earliest?.date || new Date()
      endDate = latest?.date || new Date()
    } else {
      // Default to selected year
      startDate = startOfYear(new Date(year, 0, 1))
      endDate = endOfYear(new Date(year, 0, 1))
    }

    // Fetch all transactions in date range with optional bank filter
    const transactions = await prisma.expenseTransaction.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        ...(selectedBanks && selectedBanks.length > 0 ? { account: { in: selectedBanks } } : {}),
      },
      orderBy: { date: 'asc' },
    })

    // Calculate summary
    let totalIncome = 0
    let totalExpense = 0

    transactions.forEach(t => {
      const amount = Number(t.amount)
      if (t.type === 'INCOME') {
        totalIncome += amount
      } else {
        totalExpense += amount
      }
    })

    const summary = {
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense,
    }

    // Calculate monthly data
    const monthlyMap = new Map<string, { income: number; expense: number }>()

    transactions.forEach(t => {
      const month = format(new Date(t.date), 'MMM yyyy')
      const existing = monthlyMap.get(month) || { income: 0, expense: 0 }
      const amount = Number(t.amount)

      if (t.type === 'INCOME') {
        existing.income += amount
      } else {
        existing.expense += amount
      }

      monthlyMap.set(month, existing)
    })

    const monthlyData = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      income: data.income,
      expense: data.expense,
      net: data.income - data.expense,
    }))

    // Calculate account breakdown
    const incomeByAccount = new Map<string, number>()
    const expenseByAccount = new Map<string, number>()

    transactions.forEach(t => {
      const amount = Number(t.amount)
      if (t.type === 'INCOME') {
        incomeByAccount.set(t.account, (incomeByAccount.get(t.account) || 0) + amount)
      } else {
        expenseByAccount.set(t.account, (expenseByAccount.get(t.account) || 0) + amount)
      }
    })

    const accountBreakdown = {
      income: Array.from(incomeByAccount.entries()).map(([account, amount]) => ({
        account,
        amount,
      })),
      expense: Array.from(expenseByAccount.entries()).map(([account, amount]) => ({
        account,
        amount,
      })),
    }

    // Trend data (same as monthly but simplified)
    const trendData = monthlyData.map(m => ({
      month: m.month,
      income: m.income,
      expense: m.expense,
    }))

    // Category breakdown (by name for expenses)
    const expenseCategoryMap = new Map<string, number>()
    transactions.forEach(t => {
      if (t.type === 'EXPENSE') {
        const amount = Number(t.amount)
        expenseCategoryMap.set(t.name, (expenseCategoryMap.get(t.name) || 0) + amount)
      }
    })

    const categoryBreakdown = Array.from(expenseCategoryMap.entries())
      .map(([name, amount]) => ({ name, value: amount }))
      .sort((a, b) => b.value - a.value)

    // Top expenses
    const topExpenses = categoryBreakdown.slice(0, 10)

    // Income category breakdown
    const incomeCategoryMap = new Map<string, number>()
    transactions.forEach(t => {
      if (t.type === 'INCOME') {
        const amount = Number(t.amount)
        incomeCategoryMap.set(t.name, (incomeCategoryMap.get(t.name) || 0) + amount)
      }
    })

    const incomeCategoryBreakdown = Array.from(incomeCategoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    return NextResponse.json({
      success: true,
      summary,
      monthlyData,
      accountBreakdown,
      trendData,
      categoryBreakdown,
      topExpenses,
      incomeCategoryBreakdown,
    })
  } catch (error) {
    console.error('Dashboard GET error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
