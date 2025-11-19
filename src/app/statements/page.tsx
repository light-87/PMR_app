'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ProtectedLayout } from '@/components/Layout/ProtectedLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { formatCurrency } from '@/lib/utils'
import { ACCOUNT_LABELS } from '@/types'
import type { ExpenseTransaction } from '@/types'
import { FileText } from 'lucide-react'

export default function StatementsPage() {
  const [names, setNames] = useState<string[]>([])
  const [selectedName, setSelectedName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [statement, setStatement] = useState<{
    transactions: ExpenseTransaction[]
    totalBalance: number
  } | null>(null)

  useEffect(() => {
    fetchNames()
  }, [])

  const fetchNames = async () => {
    try {
      const response = await fetch('/api/expenses')
      const data = await response.json()
      if (data.success) {
        setNames(data.uniqueNames)
      }
    } catch (error) {
      console.error('Failed to fetch names:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!selectedName) return

    setGenerating(true)
    try {
      const params = new URLSearchParams({ name: selectedName })
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)

      const response = await fetch(`/api/statements?${params}`)
      const data = await response.json()

      if (data.success) {
        setStatement({
          transactions: data.transactions,
          totalBalance: data.totalBalance,
        })
      }
    } catch (error) {
      console.error('Failed to generate statement:', error)
    } finally {
      setGenerating(false)
    }
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
        <h1 className="text-3xl font-bold">Customer Statements</h1>

        <Card>
          <CardHeader>
            <CardTitle>Generate Statement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Customer/Vendor</Label>
              <Select value={selectedName} onValueChange={setSelectedName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select name" />
                </SelectTrigger>
                <SelectContent>
                  {names.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">From Date (Optional)</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">To Date (Optional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!selectedName || generating}
              className="w-full"
            >
              <FileText className="h-4 w-4 mr-2" />
              {generating ? 'Generating...' : 'Generate Statement'}
            </Button>
          </CardContent>
        </Card>

        {statement && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Statement for: {selectedName}</CardTitle>
                </div>
                <div className={`text-right ${statement.totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <p className="text-sm text-muted-foreground">Total Balance</p>
                  <p className="text-2xl font-bold">
                    ₹{formatCurrency(Math.abs(statement.totalBalance))}
                    {statement.totalBalance < 0 && ' (Due)'}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-semibold">#</th>
                      <th className="text-left p-3 font-semibold">Date</th>
                      <th className="text-right p-3 font-semibold">Amount</th>
                      <th className="text-left p-3 font-semibold">Account</th>
                      <th className="text-center p-3 font-semibold">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.transactions.map((t, index) => (
                      <tr key={t.id} className="border-b">
                        <td className="p-3">{index + 1}</td>
                        <td className="p-3">
                          {format(new Date(t.date), 'dd-MMM-yyyy')}
                        </td>
                        <td className={`text-right p-3 ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{formatCurrency(Number(t.amount))}
                        </td>
                        <td className="p-3">{ACCOUNT_LABELS[t.account]}</td>
                        <td className="text-center p-3">{t.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedLayout>
  )
}
