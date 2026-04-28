'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, UserCheck, Clock, XCircle, UserX } from 'lucide-react'
import { cn } from '@/lib/utils'

type EmployeeStatus = {
  id: string
  name: string
  phone: string
  status: 'PRESENT' | 'ABSENT' | null
  source: 'FACE_SCAN' | 'ADMIN_MANUAL' | 'EMPLOYEE_SELF' | null
  approved: boolean | null
  markedAt: string | null
}

type Summary = {
  total: number
  presentApproved: number
  presentPending: number
  absent: number
  notMarked: number
}

const SOURCE_LABEL: Record<string, string> = {
  FACE_SCAN: 'Face scan',
  ADMIN_MANUAL: 'Admin',
  EMPLOYEE_SELF: 'Self-mark',
}

type Filter = 'all' | 'present' | 'pending' | 'absent' | 'not_marked'

export default function TodayPage() {
  const [employees, setEmployees] = useState<EmployeeStatus[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/employee/attendance/today')
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed')
      setEmployees(json.data)
      setSummary(json.summary)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = employees.filter(emp => {
    switch (filter) {
      case 'present':
        return emp.status === 'PRESENT' && emp.approved
      case 'pending':
        return emp.status === 'PRESENT' && emp.approved === false
      case 'absent':
        return emp.status === 'ABSENT' && emp.approved
      case 'not_marked':
        return emp.status === null
      default:
        return true
    }
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Today&apos;s Attendance</h1>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <SummaryCard
            label="Present"
            count={summary.presentApproved}
            total={summary.total}
            color="bg-green-500/15 text-green-700"
            icon={<UserCheck className="h-4 w-4" />}
            active={filter === 'present'}
            onClick={() => setFilter(f => f === 'present' ? 'all' : 'present')}
          />
          <SummaryCard
            label="Pending"
            count={summary.presentPending}
            total={summary.total}
            color="bg-amber-500/15 text-amber-700"
            icon={<Clock className="h-4 w-4" />}
            active={filter === 'pending'}
            onClick={() => setFilter(f => f === 'pending' ? 'all' : 'pending')}
          />
          <SummaryCard
            label="Absent"
            count={summary.absent}
            total={summary.total}
            color="bg-red-500/15 text-red-700"
            icon={<XCircle className="h-4 w-4" />}
            active={filter === 'absent'}
            onClick={() => setFilter(f => f === 'absent' ? 'all' : 'absent')}
          />
          <SummaryCard
            label="Not marked"
            count={summary.notMarked}
            total={summary.total}
            color="bg-muted text-muted-foreground"
            icon={<UserX className="h-4 w-4" />}
            active={filter === 'not_marked'}
            onClick={() => setFilter(f => f === 'not_marked' ? 'all' : 'not_marked')}
          />
        </div>
      )}

      {/* Employee list */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {employees.length === 0 ? 'No active employees.' : 'No employees match this filter.'}
        </Card>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(emp => (
            <Card key={emp.id} className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{emp.name}</div>
                <div className="text-xs text-muted-foreground">{emp.phone}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {emp.status === 'PRESENT' && emp.approved && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/15 text-green-700 font-medium">
                      <UserCheck className="h-3 w-3" /> Present
                    </span>
                    <span className="text-muted-foreground hidden sm:inline">
                      {emp.source && SOURCE_LABEL[emp.source]}
                      {emp.markedAt && ` · ${new Date(emp.markedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
                    </span>
                  </div>
                )}
                {emp.status === 'PRESENT' && emp.approved === false && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/15 text-amber-700 font-medium">
                      <Clock className="h-3 w-3" /> Pending
                    </span>
                    <span className="text-muted-foreground hidden sm:inline">
                      {emp.source && SOURCE_LABEL[emp.source]}
                    </span>
                  </div>
                )}
                {emp.status === 'ABSENT' && emp.approved && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/15 text-red-700 text-xs font-medium">
                    <XCircle className="h-3 w-3" /> Absent
                  </span>
                )}
                {emp.status === null && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                    <UserX className="h-3 w-3" /> Not marked
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {filter !== 'all' && (
        <button
          className="text-xs text-muted-foreground hover:text-foreground underline"
          onClick={() => setFilter('all')}
        >
          Clear filter — show all {summary?.total} employees
        </button>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  count,
  total,
  color,
  icon,
  active,
  onClick,
}: {
  label: string
  count: number
  total: number
  color: string
  icon: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-lg p-3 text-left transition-all',
        color,
        active && 'ring-2 ring-primary ring-offset-1',
        'hover:opacity-80'
      )}
    >
      <div className="flex items-center justify-between">
        {icon}
        <span className="text-2xl font-bold">{count}</span>
      </div>
      <div className="text-xs mt-1 opacity-80">{label} / {total}</div>
    </button>
  )
}
