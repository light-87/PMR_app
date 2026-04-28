'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, IndianRupee, ClipboardCheck, Calendar } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { toMonthStringIST } from '@/lib/date-utils'

type SalaryResp = {
  employee: { id: string; name: string; monthlySalary: string }
  totalEarned: string
  totalPaid: string
  balance: string
  byMonth: { month: string; daysAttended: number; daysInMonth: number; earned: string }[]
}

export default function StaffDashboardPage() {
  const [data, setData] = useState<SalaryResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/staff/salary')
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed')
      setData(json.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  const thisMonth = useMemo(() => {
    if (!data) return null
    const m = toMonthStringIST(new Date())
    return data.byMonth.find((b) => b.month === m) ?? null
  }, [data])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    )
  }
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!data) return null

  const balance = Number(data.balance)

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted-foreground">Welcome back</p>
        <h1 className="text-xl font-bold">{data.employee.name}</h1>
      </div>

      <Card
        className={cn(
          'p-4',
          balance >= 0 ? 'border-amber-300 bg-amber-50' : 'border-blue-300 bg-blue-50'
        )}
      >
        <div className="text-xs text-muted-foreground">
          {balance >= 0 ? 'Pending salary balance' : 'Overpaid (carry-forward)'}
        </div>
        <div className="text-3xl font-bold mt-1 inline-flex items-center">
          <IndianRupee className="h-6 w-6" />
          {formatCurrency(Math.abs(balance))}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          ₹{formatCurrency(Number(data.totalEarned))} earned · ₹{formatCurrency(Number(data.totalPaid))} paid all time
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" /> This month
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <div>
            <div className="text-2xl font-bold">{thisMonth?.daysAttended ?? 0}</div>
            <div className="text-xs text-muted-foreground">days present</div>
          </div>
          <div>
            <div className="text-2xl font-bold inline-flex items-center">
              <IndianRupee className="h-5 w-5" />
              {formatCurrency(Number(thisMonth?.earned ?? 0))}
            </div>
            <div className="text-xs text-muted-foreground">earned this month</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Salary: ₹{formatCurrency(Number(data.employee.monthlySalary))}/month ·{' '}
          {thisMonth?.daysInMonth ?? '?'} days in month
        </div>
      </Card>

      <Link href="/staff/mark">
        <Button className="w-full h-14 text-base">
          <ClipboardCheck className="h-5 w-5 mr-2" /> Mark today
        </Button>
      </Link>
    </div>
  )
}
