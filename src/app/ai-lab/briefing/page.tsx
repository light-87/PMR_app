'use client'

import { useState, useEffect } from 'react'
import { ProtectedLayout } from '@/components/Layout/ProtectedLayout'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Sun, RefreshCw, Loader2, Volume2 } from 'lucide-react'
import Link from 'next/link'

interface BriefingSummary {
  yesterdayIncome: number
  yesterdayExpense: number
  yesterdayNet: number
  bucketsSold: number
  bucketsStocked: number
  ureaStock: number
  defStock: number
  todayFollowUps: number
}

export default function BriefingPage() {
  const [briefing, setBriefing] = useState('')
  const [summary, setSummary] = useState<BriefingSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [playingAudio, setPlayingAudio] = useState(false)

  async function fetchBriefing() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai-lab/briefing')
      const data = await res.json()
      if (data.success) {
        setBriefing(data.data.briefing)
        setSummary(data.data.summary)
      } else {
        setError(data.error || 'Failed to generate briefing')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBriefing()
  }, [])

  async function handleReadAloud() {
    if (!briefing || playingAudio) return
    setPlayingAudio(true)
    try {
      const res = await fetch('/api/ai-lab/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: briefing.slice(0, 500), language: 'mr-IN' }),
      })
      if (res.ok) {
        const audioBlob = await res.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)
        audio.onended = () => setPlayingAudio(false)
        audio.onerror = () => setPlayingAudio(false)
        audio.play()
      } else {
        setPlayingAudio(false)
      }
    } catch {
      setPlayingAudio(false)
    }
  }

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
            <h1 className="text-xl font-bold">Smart Daily Briefing</h1>
            <p className="text-sm text-muted-foreground">AI-generated morning summary in Marathi</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReadAloud}
              disabled={!briefing || playingAudio}
            >
              <Volume2 className={`h-4 w-4 mr-1 ${playingAudio ? 'animate-pulse' : ''}`} />
              {playingAudio ? 'Playing...' : 'Read Aloud'}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchBriefing} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-2 mb-4">
          <p className="text-xs text-blue-700">
            Read-only — this summarizes your business data, no changes are made.
          </p>
        </div>

        {loading && (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="mt-4 text-sm text-muted-foreground">Generating your briefing...</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && briefing && (
          <div className="space-y-4">
            {/* Quick stats */}
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-xs text-green-600">Income</p>
                  <p className="text-sm font-bold text-green-700">
                    {summary.yesterdayIncome.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-xs text-red-600">Expense</p>
                  <p className="text-sm font-bold text-red-700">
                    {summary.yesterdayExpense.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-xs text-blue-600">Sold</p>
                  <p className="text-sm font-bold text-blue-700">{summary.bucketsSold} buckets</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-xs text-amber-600">Follow-ups</p>
                  <p className="text-sm font-bold text-amber-700">{summary.todayFollowUps} today</p>
                </div>
              </div>
            )}

            {/* AI Briefing */}
            <div className="rounded-lg border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sun className="h-5 w-5 text-amber-500" />
                <h2 className="font-semibold">Morning Briefing</h2>
              </div>
              <div className="prose prose-sm max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                {briefing}
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedLayout>
  )
}
