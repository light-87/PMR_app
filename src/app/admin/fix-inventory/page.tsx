'use client'

import { useState } from 'react'
import { ProtectedLayout } from '@/components/Layout/ProtectedLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, Wrench } from 'lucide-react'
import Link from 'next/link'

export default function FixInventoryPage() {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    corrections?: Record<string, number>
    finalBalances?: Record<string, Record<string, number>>
    log?: string[]
  } | null>(null)

  const handleFix = async () => {
    setRunning(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/fix-inventory-totals', {
        method: 'POST',
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to repair inventory totals',
      })
    } finally {
      setRunning(false)
    }
  }

  return (
    <ProtectedLayout requiredRole="ADMIN">
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Fix Inventory Running Totals
            </CardTitle>
            <CardDescription>
              Recalculate all inventory running totals in chronological order. Use this if you notice
              discrepancies in bucket stock balances at Pallavi or Tularam warehouses.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">What this does:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Fetches all inventory transactions in chronological order</li>
                    <li>Recalculates running totals for each bucket type + warehouse combination</li>
                    <li>Corrects any discrepancies found</li>
                    <li>Returns a detailed log of changes</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button
              onClick={handleFix}
              disabled={running}
              className="w-full"
              size="lg"
            >
              {running ? 'Recalculating...' : 'Run Inventory Repair'}
            </Button>

            {result && (
              <div className={`rounded-lg p-4 ${
                result.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`font-semibold ${
                      result.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {result.message}
                    </p>

                    {result.corrections && Object.keys(result.corrections).length > 0 && (
                      <div className="mt-3">
                        <p className="font-semibold text-sm text-gray-700">Corrections Made:</p>
                        <ul className="mt-1 space-y-1 text-sm text-gray-600">
                          {Object.entries(result.corrections).map(([key, count]) => (
                            <li key={key}>
                              {key}: {count} transaction{count !== 1 ? 's' : ''} corrected
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.finalBalances && (
                      <div className="mt-3">
                        <p className="font-semibold text-sm text-gray-700">Final Balances:</p>
                        <div className="mt-2 grid grid-cols-1 gap-2 text-sm">
                          {Object.entries(result.finalBalances).map(([bucketType, warehouses]) => (
                            <div key={bucketType} className="bg-white rounded border border-gray-200 p-2">
                              <span className="font-semibold">{bucketType}:</span>
                              <ul className="ml-4 mt-1 space-y-0.5 text-gray-600">
                                {Object.entries(warehouses).map(([warehouse, balance]) => (
                                  <li key={warehouse}>
                                    {warehouse}: {balance} buckets
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.log && result.log.length > 0 && (
                      <details className="mt-3">
                        <summary className="cursor-pointer font-semibold text-sm text-gray-700">
                          View Detailed Log ({result.log.length} entries)
                        </summary>
                        <div className="mt-2 bg-white rounded border border-gray-200 p-3 max-h-96 overflow-y-auto">
                          <pre className="text-xs font-mono whitespace-pre-wrap">
                            {result.log.join('\n')}
                          </pre>
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <Link href="/inventory">
                <Button variant="outline" className="w-full">
                  Go to Inventory
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  )
}
