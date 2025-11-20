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
import { FileText, Printer } from 'lucide-react'

export default function StatementsPage() {
  const [names, setNames] = useState<string[]>([])
  const [selectedName, setSelectedName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [allTime, setAllTime] = useState(false)
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
      if (!allTime) {
        if (startDate) params.set('startDate', startDate)
        if (endDate) params.set('endDate', endDate)
      }

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

  const handlePrint = () => {
    window.print()
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
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }

          .print-only {
            display: block !important;
          }

          @page {
            margin: 20mm;
          }

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .print-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #000;
          }

          .print-logo {
            max-width: 168px;
            height: auto;
          }

          .print-contact {
            text-align: right;
            font-size: 12px;
            line-height: 1.6;
          }

          .print-statement-title {
            font-size: 24px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
          }

          .print-customer-info {
            margin: 20px 0;
            font-size: 14px;
          }

          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }

          .print-table th,
          .print-table td {
            border: 1px solid #000;
            padding: 8px;
          }

          .print-table th {
            background-color: #f0f0f0;
            font-weight: bold;
          }

          .print-balance {
            margin-top: 30px;
            text-align: right;
            font-size: 18px;
            font-weight: bold;
          }

          .text-green-600 {
            color: #16a34a !important;
          }

          .text-red-600 {
            color: #dc2626 !important;
          }
        }

        .print-only {
          display: none;
        }
      `}</style>

      <div className="space-y-6">
        {statement && (
          <div className="print-only">
            <div className="print-header">
              <img src="/logo.png" alt="Company Logo" className="print-logo" />
              <div className="print-contact">
                <div><strong>Address:</strong> Pimpalgaon Manegao, Maharashtra</div>
                <div><strong>Email:</strong> pbgaydhane@gmail.com</div>
                <div><strong>Phone:</strong> +917030847030</div>
                <div><strong>Phone:</strong> +917020143332</div>
              </div>
            </div>

            <div className="print-statement-title">Customer Statement</div>

            <div className="print-customer-info">
              <strong>Customer/Vendor:</strong> {selectedName}
              <br />
              <strong>Period:</strong> {allTime ? 'All time' : `${startDate || 'Beginning'} to ${endDate || 'Present'}`}
              <br />
              <strong>Generated on:</strong> {format(new Date(), 'dd-MMM-yyyy')}
            </div>

            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: '5%' }}>#</th>
                  <th style={{ width: '20%' }}>Date</th>
                  <th style={{ width: '20%', textAlign: 'right' }}>Amount</th>
                  <th style={{ width: '30%' }}>Account</th>
                  <th style={{ width: '25%', textAlign: 'center' }}>Type</th>
                </tr>
              </thead>
              <tbody>
                {statement.transactions.map((t, index) => (
                  <tr key={t.id}>
                    <td>{index + 1}</td>
                    <td>{format(new Date(t.date), 'dd-MMM-yyyy')}</td>
                    <td style={{ textAlign: 'right' }} className={t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}>
                      ₹{formatCurrency(Number(t.amount))}
                    </td>
                    <td>{ACCOUNT_LABELS[t.account]}</td>
                    <td style={{ textAlign: 'center' }}>{t.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className={`print-balance ${statement.totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Total Balance: ₹{formatCurrency(Math.abs(statement.totalBalance))}
              {statement.totalBalance < 0 && ' (Due)'}
            </div>
          </div>
        )}

        <h1 className="text-3xl font-bold no-print">Customer Statements</h1>

        <Card className="no-print">
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

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  id="allTime"
                  type="checkbox"
                  checked={allTime}
                  onChange={(e) => {
                    setAllTime(e.target.checked)
                    if (e.target.checked) {
                      setStartDate('')
                      setEndDate('')
                    }
                  }}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <Label htmlFor="allTime" className="cursor-pointer">
                  All time
                </Label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">From Date (Optional)</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={allTime}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">To Date (Optional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={allTime}
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
            <CardHeader className="no-print">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Statement for: {selectedName}</CardTitle>
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    onClick={handlePrint}
                    variant="outline"
                    size="sm"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                  <div className={`text-right ${statement.totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <p className="text-sm text-muted-foreground">Total Balance</p>
                    <p className="text-2xl font-bold">
                      ₹{formatCurrency(Math.abs(statement.totalBalance))}
                      {statement.totalBalance < 0 && ' (Due)'}
                    </p>
                  </div>
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
