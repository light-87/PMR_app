'use client'

import { useState, useEffect } from 'react'
import { ProtectedLayout } from '@/components/Layout/ProtectedLayout'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Factory, RefreshCw, Loader2, Beaker, Droplets, TrendingUp, Users, Lightbulb } from 'lucide-react'
import Link from 'next/link'
import { MarkdownRenderer } from '../components/MarkdownRenderer'

interface AdvisorMetrics {
  ureaStock: number
  defStock: number
  batchesPossible: number
  avgDailySales: number
  totalSold30Days: number
  recentBatches: number
  activeLeads: number
}

export default function ProductionAdvisorPage() {
  const [advice, setAdvice] = useState('')
  const [metrics, setMetrics] = useState<AdvisorMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function fetchAdvice() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai-lab/production-advisor')
      const data = await res.json()
      if (data.success) {
        setAdvice(data.data.advice)
        setMetrics(data.data.metrics)
      } else {
        setError(data.error || 'Failed to generate advice')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdvice()
  }, [])

  return (
    <ProtectedLayout>
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/ai-lab">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Production Advisor</h1>
            <p className="text-sm text-muted-foreground">AI-powered production planning in Marathi</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAdvice} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-2 mb-4">
          <p className="text-xs text-blue-700">
            Read-only — this analyzes your production data and gives recommendations. No changes are made.
          </p>
        </div>

        {loading && (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="mt-4 text-sm text-muted-foreground">Analyzing production data...</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && advice && (
          <div className="space-y-4">
            {/* Key metrics */}
            {metrics && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Beaker className="h-3.5 w-3.5 text-orange-500" />
                    <p className="text-xs text-orange-600">Urea</p>
                  </div>
                  <p className="text-sm font-bold text-orange-700">{metrics.ureaStock} kg</p>
                  <p className="text-[10px] text-orange-500">{Math.round(metrics.ureaStock / 45)} bags</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Droplets className="h-3.5 w-3.5 text-blue-500" />
                    <p className="text-xs text-blue-600">Free DEF</p>
                  </div>
                  <p className="text-sm font-bold text-blue-700">{metrics.defStock} L</p>
                  <p className="text-[10px] text-blue-500">{metrics.batchesPossible} batches possible</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                    <p className="text-xs text-green-600">Sales</p>
                  </div>
                  <p className="text-sm font-bold text-green-700">~{metrics.avgDailySales}/day</p>
                  <p className="text-[10px] text-green-500">{metrics.totalSold30Days} in 30 days</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Users className="h-3.5 w-3.5 text-purple-500" />
                    <p className="text-xs text-purple-600">Hot Leads</p>
                  </div>
                  <p className="text-sm font-bold text-purple-700">{metrics.activeLeads}</p>
                  <p className="text-[10px] text-purple-500">near conversion</p>
                </div>
              </div>
            )}

            {/* AI Advice */}
            <div className="rounded-lg border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Factory className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Production Recommendations</h2>
              </div>
              <MarkdownRenderer content={advice} />
            </div>
          </div>
        )}

        {/* What the advisor analyzes */}
        <div className="mt-6 rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-medium">What the advisor tells you</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { text: 'Should you produce a batch today?', color: 'bg-green-50 text-green-700 border-green-200' },
              { text: '7-day production schedule plan', color: 'bg-blue-50 text-blue-700 border-blue-200' },
              { text: 'Which bucket types to fill first (by demand)', color: 'bg-purple-50 text-purple-700 border-purple-200' },
              { text: 'When to order more urea bags', color: 'bg-orange-50 text-orange-700 border-orange-200' },
              { text: 'Stockout risk warnings per bucket type', color: 'bg-red-50 text-red-700 border-red-200' },
              { text: 'Days of stock remaining per product', color: 'bg-amber-50 text-amber-700 border-amber-200' },
              { text: 'Impact of upcoming lead conversions on demand', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
              { text: 'Urea-to-DEF conversion efficiency check', color: 'bg-teal-50 text-teal-700 border-teal-200' },
              { text: 'Sales velocity trends (growing/declining)', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
              { text: 'Warehouse balance — where to move stock', color: 'bg-pink-50 text-pink-700 border-pink-200' },
              { text: 'Weekend/holiday production planning', color: 'bg-lime-50 text-lime-700 border-lime-200' },
              { text: 'Capital optimization — avoid overproduction', color: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' },
            ].map((item) => (
              <div key={item.text} className={`text-xs px-2.5 py-1.5 rounded border ${item.color}`}>
                {item.text}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Tip: Check this every morning before starting production. Hit Refresh after adding new stock entries.
          </p>
        </div>
      </div>
    </ProtectedLayout>
  )
}
