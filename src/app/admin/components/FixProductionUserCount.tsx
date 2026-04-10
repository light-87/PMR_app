'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle2, Loader2, RotateCcw, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

interface StockTransaction {
  id: string
  date: string
  type: string
  quantity: number
  runningTotal: number
  description: string
}

interface FixStatus {
  state: 'idle' | 'fetching' | 'preview' | 'loading' | 'success' | 'error'
  message: string
  transactions: StockTransaction[]
  selectedTx: StockTransaction | null
  newQuantity: number | null
  details: {
    txId: string
    oldQuantity: number
    newQuantity: number
    difference: number
    affectedTransactions: number
    newRunningTotal: number
  } | null
}

export function FixProductionUserCount() {
  const [status, setStatus] = useState<FixStatus>({
    state: 'idle',
    message: '',
    transactions: [],
    selectedTx: null,
    newQuantity: null,
    details: null,
  })

  const [searchQuantity, setSearchQuantity] = useState('90000')
  const [correctedQuantity, setCorrectedQuantity] = useState('9000')

  // Fetch recent stock transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setStatus(prev => ({ ...prev, state: 'fetching' }))
        const response = await fetch('/api/stock?limit=50')
        const data = await response.json()

        if (data.success) {
          setStatus(prev => ({
            ...prev,
            transactions: data.transactions || [],
            state: 'idle',
          }))
        }
      } catch (error) {
        setStatus(prev => ({
          ...prev,
          state: 'error',
          message: 'Failed to fetch transactions',
        }))
      }
    }

    fetchTransactions()
  }, [])

  // Find the mistaken transaction
  const findMisstakenTransaction = () => {
    const searchVal = Number(searchQuantity)
    const found = status.transactions.find(tx => tx.quantity === searchVal)

    if (!found) {
      setStatus(prev => ({
        ...prev,
        state: 'error',
        message: `No transaction found with quantity ${searchVal}. Showing recent transactions above.`,
        selectedTx: null,
      }))
      return
    }

    setStatus(prev => ({
      ...prev,
      selectedTx: found,
      state: 'idle',
      message: '',
    }))
  }

  // Preview the correction
  const handlePreview = async () => {
    if (!status.selectedTx || !correctedQuantity) {
      setStatus(prev => ({
        ...prev,
        state: 'error',
        message: 'Please select a transaction and enter corrected quantity',
      }))
      return
    }

    try {
      setStatus(prev => ({ ...prev, state: 'loading' }))

      const newQty = Number(correctedQuantity)
      const response = await fetch('/api/admin/fix-stock-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          transactionId: status.selectedTx.id,
          newQuantity: newQty,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setStatus(prev => ({
          ...prev,
          state: 'preview',
          newQuantity: newQty,
          details: data.details,
          message: 'Preview ready - review the changes below',
        }))
      } else {
        setStatus(prev => ({
          ...prev,
          state: 'error',
          message: data.message || 'Failed to preview',
        }))
      }
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        state: 'error',
        message: 'Error previewing changes',
      }))
    }
  }

  // Apply the fix
  const handleApply = async () => {
    if (!status.selectedTx || !correctedQuantity) return

    try {
      setStatus(prev => ({ ...prev, state: 'loading' }))

      const newQty = Number(correctedQuantity)
      const response = await fetch('/api/admin/fix-stock-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply',
          transactionId: status.selectedTx.id,
          newQuantity: newQty,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setStatus(prev => ({
          ...prev,
          state: 'success',
          newQuantity: newQty,
          details: data.details,
          message: '✅ Stock transaction fixed and running totals recalculated!',
        }))
      } else {
        setStatus(prev => ({
          ...prev,
          state: 'error',
          message: data.message || 'Failed to apply fix',
        }))
      }
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        state: 'error',
        message: 'Error applying fix',
      }))
    }
  }

  const handleReset = () => {
    setStatus(prev => ({
      ...prev,
      selectedTx: null,
      newQuantity: null,
      details: null,
      state: 'idle',
      message: '',
    }))
    setSearchQuantity('90000')
    setCorrectedQuantity('9000')
  }

  const formatNumber = (num: number) => new Intl.NumberFormat('en-IN').format(Math.round(num))

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-900">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          Fix Stock Transaction (90000 → 9000)
        </CardTitle>
        <CardDescription className="text-yellow-800">
          Correct mistaken urea quantity and auto-recalculate all running totals
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Search Section */}
        <div className="space-y-3 p-4 bg-white rounded-lg border border-gray-200">
          <div>
            <Label className="text-sm font-semibold">Step 1: Find Mistaken Transaction</Label>
            <p className="text-xs text-gray-600 mt-1">Search by incorrect quantity value</p>
          </div>

          <div className="flex gap-2">
            <Input
              type="number"
              value={searchQuantity}
              onChange={(e) => setSearchQuantity(e.target.value)}
              placeholder="e.g., 90000"
              disabled={status.state === 'loading' || status.selectedTx !== null}
              className="flex-1"
            />
            <Button
              onClick={findMisstakenTransaction}
              disabled={status.state === 'loading' || status.selectedTx !== null}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Search
            </Button>
          </div>

          {status.selectedTx && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-900 font-semibold">✓ Transaction Found:</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-blue-700">Date:</span>
                  <p className="font-mono">{new Date(status.selectedTx.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-blue-700">Current Qty:</span>
                  <p className="font-mono text-red-600 font-semibold">{formatNumber(status.selectedTx.quantity)} kg</p>
                </div>
                <div>
                  <span className="text-blue-700">Type:</span>
                  <p className="font-mono">{status.selectedTx.type}</p>
                </div>
                <div>
                  <span className="text-blue-700">Running Total:</span>
                  <p className="font-mono text-red-600">{formatNumber(status.selectedTx.runningTotal)} kg</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Correction Input */}
        {status.selectedTx && (
          <div className="space-y-3 p-4 bg-white rounded-lg border border-gray-200">
            <div>
              <Label className="text-sm font-semibold">Step 2: Enter Correct Quantity</Label>
              <p className="text-xs text-gray-600 mt-1">What should the value actually be?</p>
            </div>

            <div className="flex gap-2">
              <Input
                type="number"
                value={correctedQuantity}
                onChange={(e) => setCorrectedQuantity(e.target.value)}
                placeholder="e.g., 9000"
                disabled={status.state === 'loading' || status.state === 'preview' || status.state === 'success'}
                className="flex-1 text-lg font-semibold"
              />
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 h-fit">
                Correct
              </Badge>
            </div>

            <div className="flex gap-2 text-sm">
              <span className="text-gray-600">Reducing by:</span>
              <span className="font-semibold text-red-600">
                -{formatNumber(Number(searchQuantity) - Number(correctedQuantity))} kg
              </span>
              <span className="text-gray-600">
                ({(((Number(searchQuantity) - Number(correctedQuantity)) / Number(searchQuantity)) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        )}

        {/* Impact Preview */}
        {status.details && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 space-y-3">
            <h3 className="font-semibold text-blue-900 flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Impact Analysis
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-blue-700">Old Quantity</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatNumber(status.details.oldQuantity)} kg
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-blue-700">New Quantity</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(status.details.newQuantity)} kg
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-blue-700">Adjustment</p>
                <p className="text-xl font-bold text-orange-600">
                  -{formatNumber(status.details.difference)} kg
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-blue-700">Running Total (After)</p>
                <p className="text-xl font-bold text-blue-900">
                  {formatNumber(status.details.newRunningTotal)} kg
                </p>
              </div>
            </div>

            <div className="border-t border-blue-200 pt-3">
              <p className="text-sm text-blue-900">
                <strong>📊 Recalculation:</strong> {status.details.affectedTransactions} transaction(s) will be recalculated with corrected running totals
              </p>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {status.state === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{status.message}</AlertDescription>
          </Alert>
        )}

        {status.state === 'success' && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {status.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Recent Transactions Table */}
        {status.transactions.length > 0 && !status.selectedTx && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-600">Recent Stock Transactions</Label>
            <div className="max-h-64 overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-right">Qty (kg)</th>
                    <th className="px-3 py-2 text-right">Running Total</th>
                  </tr>
                </thead>
                <tbody>
                  {status.transactions.slice(0, 20).map(tx => (
                    <tr key={tx.id} className={tx.quantity === Number(searchQuantity) ? 'bg-yellow-100' : 'hover:bg-gray-50'}>
                      <td className="px-3 py-2">{new Date(tx.date).toLocaleDateString()}</td>
                      <td className="px-3 py-2">{tx.type}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {tx.quantity === Number(searchQuantity) ? (
                          <span className="text-red-600 font-bold">🔴 {formatNumber(tx.quantity)}</span>
                        ) : (
                          formatNumber(tx.quantity)
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-600">{formatNumber(tx.runningTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          {status.state === 'idle' || status.state === 'preview' ? (
            <>
              <Button
                variant="outline"
                onClick={handleReset}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>

              {status.state === 'preview' && (
                <>
                  <Button
                    onClick={handlePreview}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    Recalculate Preview
                  </Button>

                  <Button
                    onClick={handleApply}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Apply Fix & Recalculate
                    </>
                  </Button>
                </>
              )}

              {status.state === 'idle' && status.selectedTx && (
                <Button
                  onClick={handlePreview}
                  disabled={!correctedQuantity}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Preview Changes
                </Button>
              )}
            </>
          ) : null}
        </div>

        {/* Footer Note */}
        <div className="mt-6 p-3 bg-blue-100 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-900">
            <strong>🔒 Safety:</strong> Stock quantities are read-only in normal forms. Use this fix tool only for corrections. All changes are logged for audit purposes.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
