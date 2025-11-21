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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { SummaryCards } from './components/SummaryCards'
import { MonthlyBarChart } from './components/MonthlyBarChart'
import { MonthlyTable } from './components/MonthlyTable'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import type { DashboardResponse, ExpenseAccount } from '@/types'
import { ACCOUNT_LABELS } from '@/types'
import { ChevronDown } from 'lucide-react'

const ALL_ACCOUNTS: ExpenseAccount[] = [
  'CASH',
  'PRASHANT_GAYDHANE',
  'PMR',
  'KPG_SAVING',
  'KP_ENTERPRISES',
]

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'year' | 'last12months' | 'alltime'>('year')
  const [year, setYear] = useState(new Date().getFullYear())
  const [selectedAccounts, setSelectedAccounts] = useState<ExpenseAccount[]>([])
  const [isAllAccounts, setIsAllAccounts] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        view,
        year: year.toString(),
      })

      // Add account filter if not "All Accounts"
      if (!isAllAccounts && selectedAccounts.length > 0) {
        params.append('accounts', selectedAccounts.join(','))
      }

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
  }, [view, year, selectedAccounts, isAllAccounts])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Generate year options
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  // Handle account selection
  const handleAccountToggle = (account: ExpenseAccount) => {
    setIsAllAccounts(false)
    setSelectedAccounts((prev) =>
      prev.includes(account)
        ? prev.filter((a) => a !== account)
        : [...prev, account]
    )
  }

  const handleAllAccountsToggle = () => {
    if (isAllAccounts) {
      return // Already all accounts
    }
    setIsAllAccounts(true)
    setSelectedAccounts([])
  }

  // Get display text for account selector
  const getAccountDisplayText = () => {
    if (isAllAccounts) {
      return 'All Accounts'
    }
    if (selectedAccounts.length === 0) {
      return 'Select Accounts'
    }
    if (selectedAccounts.length === 1) {
      return ACCOUNT_LABELS[selectedAccounts[0]]
    }
    return `${selectedAccounts.length} Accounts`
  }

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
          <div className="flex flex-wrap items-center gap-2">
            {/* Account Selector */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[180px] justify-between"
                >
                  {getAccountDisplayText()}
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-3">
                <div className="space-y-2">
                  <div className="font-semibold text-sm mb-3">
                    Select Accounts
                  </div>
                  <div className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer">
                    <Checkbox
                      id="all-accounts"
                      checked={isAllAccounts}
                      onCheckedChange={handleAllAccountsToggle}
                    />
                    <label
                      htmlFor="all-accounts"
                      className="text-sm font-medium leading-none cursor-pointer flex-1"
                    >
                      All Accounts
                    </label>
                  </div>
                  <div className="border-t my-2" />
                  {ALL_ACCOUNTS.map((account) => (
                    <div
                      key={account}
                      className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                    >
                      <Checkbox
                        id={account}
                        checked={!isAllAccounts && selectedAccounts.includes(account)}
                        onCheckedChange={() => handleAccountToggle(account)}
                        disabled={isAllAccounts}
                      />
                      <label
                        htmlFor={account}
                        className="text-sm leading-none cursor-pointer flex-1"
                      >
                        {ACCOUNT_LABELS[account]}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
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
