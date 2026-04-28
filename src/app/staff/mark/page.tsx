'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, ClipboardCheck, Clock } from 'lucide-react'
import { dateOnlyIST } from '@/lib/date-utils'

type Attendance = {
  id: string
  date: string
  status: 'PRESENT' | 'ABSENT'
  source: 'FACE_SCAN' | 'ADMIN_MANUAL' | 'EMPLOYEE_SELF'
  approved: boolean
}

const SOURCE_LABEL: Record<Attendance['source'], string> = {
  FACE_SCAN: 'Face scan',
  ADMIN_MANUAL: 'Admin',
  EMPLOYEE_SELF: 'Self-mark',
}

export default function StaffMarkPage() {
  const [todayRecord, setTodayRecord] = useState<Attendance | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const today = dateOnlyIST()
      const month = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}`
      const res = await fetch(`/api/staff/attendance?month=${month}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed')
      const todayStr = today.toISOString().slice(0, 10)
      const found = (json.data as Attendance[]).find(
        (r) => new Date(r.date).toISOString().slice(0, 10) === todayStr
      )
      setTodayRecord(found ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  async function mark() {
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch('/api/staff/attendance/self', { method: 'POST' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed')
      setMessage(
        json.data.approved
          ? 'You are already marked present today.'
          : 'Submitted! Waiting for admin approval.'
      )
      void load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Mark Attendance</h1>
      <p className="text-sm text-muted-foreground">
        Tap below to tell admin you&apos;re working today. They&apos;ll approve it before it counts toward your salary.
      </p>

      {todayRecord ? (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="text-xs text-muted-foreground">Today&apos;s status</div>
            <div className="text-lg font-semibold inline-flex items-center gap-2">
              {todayRecord.approved ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Approved present
                </>
              ) : (
                <>
                  <Clock className="h-5 w-5 text-amber-600" />
                  Pending admin approval
                </>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Source: {SOURCE_LABEL[todayRecord.source]}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {message && (
        <div className="text-sm rounded-md bg-green-50 border border-green-200 text-green-800 p-3">
          {message}
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button
        className="w-full h-20 text-lg"
        onClick={mark}
        disabled={submitting || todayRecord?.approved}
      >
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Submitting…
          </>
        ) : todayRecord?.approved ? (
          <>
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Already marked
          </>
        ) : (
          <>
            <ClipboardCheck className="h-5 w-5 mr-2" />
            I&apos;m working today
          </>
        )}
      </Button>
    </div>
  )
}
