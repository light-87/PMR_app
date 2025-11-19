'use client'

import { useState, useEffect, useCallback } from 'react'
import { ProtectedLayout } from '@/components/Layout/ProtectedLayout'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SummaryCards } from './components/SummaryCards'
import { MonthlyBarChart } from './components/MonthlyBarChart'
import { MonthlyTable } from './components/MonthlyTable'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import type { DashboardResponse } from '@/types'

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'year' | 'last12months' | 'alltime'>('year')
  const [year, setYear] = useState(new Date().getFullYear())

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        view,
        year: year.toString(),
      })

      const response = await fetch(`/api/dashboard?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [view, year])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Generate year options
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  if (loading) {
    return (
      <ProtectedLayout>
        <PageLoader />
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-2">
            {view === 'year' && (
              <Select
                value={year.toString()}
                onValueChange={(value) => setYear(parseInt(value))}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex gap-1">
              <Button
                variant={view === 'year' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('year')}
              >
                Year
              </Button>
              <Button
                variant={view === 'last12months' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('last12months')}
              >
                Last 12 Months
              </Button>
              <Button
                variant={view === 'alltime' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('alltime')}
              >
                All Time
              </Button>
            </div>
          </div>
        </div>

        {data && (
          <>
            <SummaryCards
              totalIncome={data.summary.totalIncome}
              totalExpense={data.summary.totalExpense}
              netProfit={data.summary.netProfit}
            />

            <MonthlyBarChart data={data.monthlyData} />

            <MonthlyTable data={data.monthlyData} />
          </>
        )}
      </div>
    </ProtectedLayout>
  )
}
