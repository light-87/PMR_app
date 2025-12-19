'use client'

import { useState } from 'react'
import { ProtectedLayout } from '@/components/Layout/ProtectedLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, Wrench } from 'lucide-react'
import Link from 'next/link'

export default function FixStockPage() {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    corrections?: Record<string, number>
    finalBalances?: Record<string, number>
    log?: string[]
  } | null>(null)

  const handleFix = async () => {
    setRunning(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/fix-stock-totals', {
        method: 'POST',
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to repair stock totals',
      })
    } finally {
      setRunning(false)
    }
  }

  return (
    <ProtectedLayout>
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Fix Stock Running Totals
            </CardTitle>
            <CardDescription>
              Recalculate all stock running totals in chronological order. Use this if you notice
              discrepancies in Urea, Free DEF, or Finished Goods stock balances.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">What this does:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Fetches all stock transactions in chronological order</li>
                    <li>Recalculates running totals for UREA, FREE_DEF, and FINISHED_GOODS</li>
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
              {running ? 'Recalculating...' : 'Run Stock Repair'}
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

                    {result.corrections && (
                      <div className="mt-3">
                        <p className="font-semibold text-sm text-gray-700">Corrections Made:</p>
                        <ul className="mt-1 space-y-1 text-sm text-gray-600">
                          {Object.entries(result.corrections).map(([category, count]) => (
                            <li key={category}>
                              {category}: {count} transaction{count !== 1 ? 's' : ''} corrected
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.finalBalances && (
                      <div className="mt-3">
                        <p className="font-semibold text-sm text-gray-700">Final Balances:</p>
                        <ul className="mt-1 space-y-1 text-sm text-gray-600">
                          {Object.entries(result.finalBalances).map(([category, balance]) => (
                            <li key={category}>
                              {category}: {balance} {category === 'UREA' ? 'kg' : 'L'}
                            </li>
                          ))}
                        </ul>
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
              <Link href="/stockboard">
                <Button variant="outline" className="w-full">
                  Go to Stock Board
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  )
}
