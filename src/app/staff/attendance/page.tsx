'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseMonthString, toMonthStringIST, toDateStringIST } from '@/lib/date-utils'

type Attendance = {
  id: string
  date: string
  markedAt: string
  status: 'PRESENT' | 'ABSENT'
  source: 'FACE_SCAN' | 'ADMIN_MANUAL' | 'EMPLOYEE_SELF'
  approved: boolean
  modified: boolean
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`
}

export default function StaffAttendancePage() {
  const [month, setMonth] = useState<string>(toMonthStringIST(new Date()))
  const [records, setRecords] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void load()
  }, [month])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/staff/attendance?month=${month}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed')
      setRecords(json.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const monthInfo = useMemo(() => parseMonthString(month), [month])
  const recordsByDate = useMemo(() => {
    const map = new Map<string, Attendance>()
    for (const r of records) map.set(toDateStringIST(new Date(r.date)), r)
    return map
  }, [records])

  // Pad starting empty cells so day-of-week aligns. JS getUTCDay: Sun=0..Sat=6; we use Mon-first (M=0).
  const firstDay = monthInfo.start.getUTCDay()
  const padStart = (firstDay + 6) % 7

  const days: { dateStr: string; label: number; record?: Attendance }[] = []
  const cursor = new Date(monthInfo.start)
  while (cursor < monthInfo.end) {
    const dateStr = toDateStringIST(cursor)
    days.push({ dateStr, label: cursor.getUTCDate(), record: recordsByDate.get(dateStr) })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  const presentApproved = records.filter((r) => r.status === 'PRESENT' && r.approved).length
  const pendingCount = records.filter((r) => !r.approved).length

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Attendance</h1>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setMonth(shiftMonth(month, -1))}>
          ←
        </Button>
        <div className="font-medium text-sm flex-1 text-center">{month}</div>
        <Button size="sm" variant="outline" onClick={() => setMonth(shiftMonth(month, 1))}>
          →
        </Button>
      </div>

      <Card className="p-3">
        <div className="grid grid-cols-7 gap-1 mb-2 text-center text-[10px] text-muted-foreground">
          {DAY_LABELS.map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: padStart }).map((_, i) => (
              <div key={`pad-${i}`} className="aspect-square" />
            ))}
            {days.map(({ dateStr, label, record }) => {
              const present = record?.status === 'PRESENT' && record.approved
              const absent = record?.status === 'ABSENT' && record.approved
              const pending = record && !record.approved
              return (
                <div
                  key={dateStr}
                  className={cn(
                    'aspect-square rounded text-xs flex items-center justify-center relative',
                    present && 'bg-green-500/20 text-green-800',
                    absent && 'bg-red-500/20 text-red-800',
                    pending && 'bg-amber-500/25 text-amber-900',
                    !record && 'bg-muted/40 text-muted-foreground'
                  )}
                >
                  {label}
                  {record?.modified && (
                    <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 bg-purple-500 rounded-full" />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {!loading && (
          <div className="text-xs flex flex-wrap gap-3 pt-3 mt-2 border-t">
            <span className="text-muted-foreground">{presentApproved} present</span>
            {pendingCount > 0 && <span className="text-amber-700">{pendingCount} pending</span>}
            <span className="ml-auto inline-flex gap-2">
              <Legend color="bg-green-500/20" label="Present" />
              <Legend color="bg-red-500/20" label="Absent" />
              <Legend color="bg-amber-500/25" label="Pending" />
            </span>
          </div>
        )}
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn('h-2.5 w-2.5 rounded', color)} />
      <span className="text-muted-foreground">{label}</span>
    </span>
  )
}
