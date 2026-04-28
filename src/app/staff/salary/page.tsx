'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Loader2, IndianRupee, Calendar } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

type Payment = {
  id: string
  type: 'REGULAR' | 'ADVANCE' | 'ADJUSTMENT'
  monthString: string
  daysInMonth: number
  daysAttended: number
  calculatedAmount: string
  amountPaid: string
  paidDate: string
}

type Resp = {
  employee: { id: string; name: string; monthlySalary: string }
  totalEarned: string
  totalPaid: string
  balance: string
  byMonth: { month: string; daysAttended: number; daysInMonth: number; earned: string }[]
  payments: Payment[]
}

export default function StaffSalaryPage() {
  const [data, setData] = useState<Resp | null>(null)
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
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

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
      <h1 className="text-xl font-bold">Salary</h1>

      <Card
        className={cn(
          'p-4',
          balance >= 0 ? 'border-amber-300 bg-amber-50' : 'border-blue-300 bg-blue-50'
        )}
      >
        <div className="text-xs text-muted-foreground">
          {balance >= 0 ? 'Pending balance' : 'Overpaid'}
        </div>
        <div className="text-3xl font-bold mt-1 inline-flex items-center">
          <IndianRupee className="h-6 w-6" />
          {formatCurrency(Math.abs(balance))}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          ₹{formatCurrency(Number(data.totalEarned))} earned · ₹{formatCurrency(Number(data.totalPaid))} paid
        </div>
      </Card>

      <div>
        <h2 className="text-sm font-semibold mb-2">Earnings by month</h2>
        {data.byMonth.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">No attendance yet.</Card>
        ) : (
          <div className="space-y-2">
            {data.byMonth.map((b) => (
              <Card key={b.month} className="p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> {b.month}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {b.daysAttended}/{b.daysInMonth} days present
                  </div>
                </div>
                <div className="font-medium inline-flex items-center">
                  <IndianRupee className="h-3.5 w-3.5" />
                  {formatCurrency(Number(b.earned))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-2">Payments received</h2>
        {data.payments.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">No payments yet.</Card>
        ) : (
          <div className="space-y-2">
            {data.payments.map((p) => (
              <Card key={p.id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> {p.monthString}
                    <span className="text-[10px] uppercase font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {p.type}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.daysAttended}/{p.daysInMonth} days · paid {new Date(p.paidDate).toLocaleDateString('en-IN')}
                  </div>
                </div>
                <div className="font-medium inline-flex items-center">
                  <IndianRupee className="h-3.5 w-3.5" />
                  {formatCurrency(Number(p.amountPaid))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
