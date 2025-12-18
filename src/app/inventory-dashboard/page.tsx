'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedLayout } from '@/components/Layout/ProtectedLayout'
import { useAuthStore } from '@/store/authStore'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  InventoryDashboardResponse,
  TimePeriodView,
  DailyPeriod,
  MonthlyPeriod,
} from '@/types'

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

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<InventoryDashboardResponse | null>(null)
  const [view, setView] = useState<TimePeriodView>('monthly')
  const [period, setPeriod] = useState<string>('3months')

  // Admin check
  useEffect(() => {
    if (role && role !== 'ADMIN') {
      router.push('/inventory')
    }
  }, [role, router])

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        view,
        period,
      })

      const response = await fetch(`/api/inventory-dashboard?${params}`)
      const result: InventoryDashboardResponse = await response.json()

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
  }, [view, period])

  useEffect(() => {
    if (role === 'ADMIN') {
      fetchDashboardData()
    }
  }, [fetchDashboardData, role])

  if (!role || role !== 'ADMIN') {
    return <PageLoader />
  }

  if (loading) {
    return (
      <ProtectedLayout>
        <PageLoader />
      </ProtectedLayout>
    )
  }

  const getPeriodOptions = () => {
    if (view === 'daily') {
      return [
        { value: '7days', label: 'Last 7 Days' },
        { value: '30days', label: 'Last 30 Days' },
      ]
    } else if (view === 'monthly') {
      return [
        { value: 'current', label: 'Current Month' },
        { value: '3months', label: 'Last 3 Months' },
        { value: '6months', label: 'Last 6 Months' },
        { value: '12months', label: 'Last 12 Months' },
      ]
    }
    return []
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Inventory Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Analytics, trends, forecasts, and reorder recommendations
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {/* View selector */}
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={view === 'daily' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setView('daily')
                  setPeriod('7days')
                }}
              >
                Daily
              </Button>
              <Button
                variant={view === 'monthly' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setView('monthly')
                  setPeriod('3months')
                }}
              >
                Monthly
              </Button>
              <Button
                variant={view === 'alltime' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setView('alltime')
                  setPeriod('')
                }}
              >
                All Time
              </Button>
            </div>

            {/* Period selector */}
            {view !== 'alltime' && (
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {getPeriodOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Overview Cards */}
        <OverviewCards data={data?.data?.overview} />

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MovementTrendsChart data={data?.data?.movementTrends} />
          <ForecastChart data={data?.data?.forecast} />
        </div>

        {/* Reorder Recommendations */}
        <ReorderRecommendationTable data={data?.data?.reorderRecommendations} />

        {/* Bucket Performance */}
        <BucketPerformanceTable data={data?.data?.bucketPerformance} />

        {/* Top Customers & Vendors */}
        <TopCustomersVendors
          topBuyers={data?.data?.topBuyers}
          topSuppliers={data?.data?.topSuppliers}
        />
      </div>
    </ProtectedLayout>
  )
}
