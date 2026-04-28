'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loader2, Check, X, Clock } from 'lucide-react'

type PendingRecord = {
  id: string
  date: string
  markedAt: string
  status: 'PRESENT' | 'ABSENT'
  source: 'FACE_SCAN' | 'ADMIN_MANUAL' | 'EMPLOYEE_SELF'
  notes: string | null
  employee: { id: string; name: string; phone: string }
}

const SOURCE_LABEL: Record<PendingRecord['source'], string> = {
  FACE_SCAN: 'Face',
  ADMIN_MANUAL: 'Admin',
  EMPLOYEE_SELF: 'Self-mark',
}

export default function PendingPage() {
  const [records, setRecords] = useState<PendingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/employee/attendance/pending')
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed')
      setRecords(json.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  async function decide(id: string, approve: boolean) {
    setBusy(id)
    try {
      const res = await fetch(`/api/employee/attendance/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approve }),
      })
      const json = await res.json()
      if (!json.success) {
        alert(json.error || 'Failed')
        return
      }
      setRecords((prev) => prev.filter((r) => r.id !== id))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Pending approvals</h1>
        <span className="text-xs text-muted-foreground">{records.length} pending</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : records.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nothing waiting for approval.</Card>
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <Card key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <Link
                  href={`/employee/${r.employee.id}`}
                  className="font-medium hover:underline"
                >
                  {r.employee.name}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {r.employee.phone} · {SOURCE_LABEL[r.source]} · {r.status}
                </div>
                <div className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  {new Date(r.date).toLocaleDateString('en-IN')} (marked {new Date(r.markedAt).toLocaleString('en-IN')})
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => decide(r.id, true)}
                  disabled={busy === r.id}
                  variant="default"
                >
                  <Check className="h-3.5 w-3.5 mr-1" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => decide(r.id, false)}
                  disabled={busy === r.id}
                >
                  <X className="h-3.5 w-3.5 mr-1" /> Reject
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
