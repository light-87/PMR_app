'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Camera,
  Edit2,
  Loader2,
  Phone as PhoneIcon,
  Trash2,
  Calendar,
  IndianRupee,
  Undo2,
  CheckCircle2,
  XCircle,
  Save,
  Download,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { parseMonthString, toMonthStringIST, toDateStringIST } from '@/lib/date-utils'
import { downloadEmployeeReport, type EmployeeReportPayload } from '../lib/report'

type Tab = 'info' | 'attendance' | 'payments'

type Employee = {
  id: string
  name: string
  phone: string
  monthlySalary: string
  openingBalance: string
  joinedDate: string
  active: boolean
  faceDescriptorCount: number
  hasPushSubscription: boolean
}

type Attendance = {
  id: string
  date: string
  markedAt: string
  status: 'PRESENT' | 'ABSENT'
  source: 'FACE_SCAN' | 'ADMIN_MANUAL' | 'EMPLOYEE_SELF'
  approved: boolean
  modified: boolean
  modifiedAt: string | null
  notes: string | null
}

type Payment = {
  id: string
  type: 'REGULAR' | 'ADVANCE' | 'ADJUSTMENT' | 'BONUS'
  periodStart: string
  daysInMonth: number
  daysAttended: number
  monthlySalary: string
  calculatedAmount: string
  amountPaid: string
  paidDate: string
  monthString: string
  notes: string | null
}

const SOURCE_LABEL: Record<Attendance['source'], string> = {
  FACE_SCAN: 'Face',
  ADMIN_MANUAL: 'Admin',
  EMPLOYEE_SELF: 'Self',
}

function nowMonth(): string {
  return toMonthStringIST(new Date())
}

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<Tab>('info')
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [attendanceMonth, setAttendanceMonth] = useState<string>(nowMonth())
  const [attendanceLoading, setAttendanceLoading] = useState(false)

  const [payments, setPayments] = useState<Payment[]>([])
  const [salarySummary, setSalarySummary] = useState<{
    totalEarned: string
    totalPaid: string
    balance: string
  } | null>(null)
  const [paymentsLoading, setPaymentsLoading] = useState(false)

  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<{
    name: string
    phone: string
    monthlySalary: string
    openingBalance: string
    active: boolean
  }>({
    name: '',
    phone: '',
    monthlySalary: '',
    openingBalance: '0',
    active: true,
  })

  useEffect(() => {
    void loadEmployee()
  }, [id])

  useEffect(() => {
    if (tab === 'attendance') void loadAttendance()
    if (tab === 'payments') void loadPayments()
  }, [tab, attendanceMonth])

  async function loadEmployee() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/employee/${id}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed')
      setEmployee(json.data)
      setEditForm({
        name: json.data.name,
        phone: json.data.phone,
        monthlySalary: String(json.data.monthlySalary),
        openingBalance: String(json.data.openingBalance ?? '0'),
        active: json.data.active,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  async function loadAttendance() {
    setAttendanceLoading(true)
    try {
      // Admin doesn't have an employee-scoped attendance GET; use staff route is wrong.
      // Use /api/employee/attendance/pending? No — that's pending only. Build a quick admin GET via the existing list API query in salary/calculate? No. Simplest: fetch via a server-side endpoint that returns by employeeId. We re-use the salary/calculate endpoint but that doesn't return raw rows.
      // Solution: read all attendance for this employee+month directly via a small inline endpoint we add — but to avoid building yet another route, hit /api/employee/attendance/pending and admin marking covers most needs. Actually we need a real list endpoint.
      const res = await fetch(`/api/employee/${id}/attendance?month=${attendanceMonth}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed')
      setAttendance(json.data)
    } catch (e) {
      console.error(e)
    } finally {
      setAttendanceLoading(false)
    }
  }

  async function loadPayments() {
    setPaymentsLoading(true)
    try {
      const res = await fetch(`/api/employee/${id}/payments`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed')
      setPayments(json.data.payments)
      setSalarySummary({
        totalEarned: json.data.totalEarned,
        totalPaid: json.data.totalPaid,
        balance: json.data.balance,
      })
    } catch (e) {
      console.error(e)
    } finally {
      setPaymentsLoading(false)
    }
  }

  async function saveInfo() {
    if (!employee) return
    const body: Record<string, string | number | boolean> = {}
    if (editForm.name !== employee.name) body.name = editForm.name
    if (editForm.phone !== employee.phone) body.phone = editForm.phone
    if (editForm.monthlySalary !== String(employee.monthlySalary)) body.monthlySalary = parseFloat(editForm.monthlySalary)
    if (editForm.openingBalance !== String(employee.openingBalance ?? '0')) body.openingBalance = parseFloat(editForm.openingBalance || '0')
    if (editForm.active !== employee.active) body.active = editForm.active
    if (Object.keys(body).length === 0) {
      setEditing(false)
      return
    }
    const res = await fetch(`/api/employee/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!json.success) {
      alert(json.error || 'Save failed')
      return
    }
    setEditing(false)
    void loadEmployee()
  }

  async function deleteEmployee() {
    if (!confirm('Set this employee inactive? They will not be able to log in or be marked present. (Soft delete — record kept.)'))
      return
    const res = await fetch(`/api/employee/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!json.success) {
      alert(json.error || 'Failed')
      return
    }
    void loadEmployee()
  }

  async function toggleAttendance(record: Attendance) {
    const newStatus: 'PRESENT' | 'ABSENT' = record.status === 'PRESENT' ? 'ABSENT' : 'PRESENT'
    const res = await fetch(`/api/employee/attendance/edit`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: record.id, status: newStatus, approved: true }),
    })
    const json = await res.json()
    if (!json.success) {
      alert(json.error || 'Failed')
      return
    }
    void loadAttendance()
  }

  async function adminMarkOnDate(dateStr: string, status: 'PRESENT' | 'ABSENT') {
    const res = await fetch(`/api/employee/attendance/admin-mark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: id, status, date: new Date(dateStr).toISOString() }),
    })
    const json = await res.json()
    if (!json.success) {
      alert(json.error || 'Failed')
      return
    }
    void loadAttendance()
  }

  const [downloading, setDownloading] = useState(false)

  async function downloadReport() {
    if (!employee) return
    setDownloading(true)
    try {
      const res = await fetch(`/api/employee/${employee.id}/report`)
      const json = await res.json()
      if (!json.success) {
        alert(json.error || 'Failed to fetch report')
        return
      }
      downloadEmployeeReport(json.data as EmployeeReportPayload)
    } finally {
      setDownloading(false)
    }
  }

  async function reversePayment(paymentId: string, amount: string) {
    if (
      !confirm(
        `Reversing ₹${formatCurrency(Number(amount))} will restore the pending balance and remove the expense ledger entry.\n\nContinue?`
      )
    )
      return
    const res = await fetch(`/api/employee/salary/${paymentId}/reverse`, { method: 'POST' })
    const json = await res.json()
    if (!json.success) {
      alert(json.error || 'Failed')
      return
    }
    void loadPayments()
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    )
  }
  if (error || !employee) {
    return <p className="text-sm text-red-600">{error || 'Not found'}</p>
  }

  return (
    <div className="space-y-4">
      <Link
        href="/employee"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            {employee.name}
            {!employee.active && (
              <span className="text-[10px] uppercase font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                Inactive
              </span>
            )}
          </h1>
          <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <PhoneIcon className="h-3 w-3" /> {employee.phone}
            <span className="ml-2">· {employee.faceDescriptorCount} face sample(s)</span>
            {employee.hasPushSubscription && <span className="ml-2 text-green-600">· Push enabled</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadReport} disabled={downloading}>
            {downloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Report (PDF)
          </Button>
          <Link href={`/employee/${id}/face`}>
            <Button variant="outline" size="sm">
              <Camera className="h-4 w-4 mr-2" /> Re-enrol face
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex border-b">
        {([
          { id: 'info', label: 'Info' },
          { id: 'attendance', label: 'Attendance' },
          { id: 'payments', label: 'Payments' },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2 text-sm border-b-2 -mb-px transition-colors',
              tab === t.id
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <Card className="p-4 space-y-3">
          {!editing ? (
            <>
              <Field label="Name" value={employee.name} />
              <Field label="Phone" value={employee.phone} />
              <Field label="Monthly salary" value={`₹${formatCurrency(Number(employee.monthlySalary))}`} />
              <Field
                label="Opening balance"
                value={
                  Number(employee.openingBalance) === 0
                    ? '—'
                    : Number(employee.openingBalance) > 0
                      ? `+₹${formatCurrency(Number(employee.openingBalance))} (owed at migration)`
                      : `-₹${formatCurrency(Math.abs(Number(employee.openingBalance)))} (advance at migration)`
                }
              />
              <Field label="Joined" value={new Date(employee.joinedDate).toLocaleDateString('en-IN')} />
              <Field label="Status" value={employee.active ? 'Active' : 'Inactive'} />
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-2" /> Edit
                </Button>
                {employee.active && (
                  <Button variant="destructive" size="sm" onClick={deleteEmployee}>
                    <Trash2 className="h-4 w-4 mr-2" /> Set Inactive
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <LabelledInput label="Name" value={editForm.name} onChange={(v) => setEditForm({ ...editForm, name: v })} />
              <LabelledInput label="Phone" value={editForm.phone} onChange={(v) => setEditForm({ ...editForm, phone: v.replace(/\D/g, '').slice(0, 15) })} />
              <LabelledInput label="Monthly salary (₹)" value={editForm.monthlySalary} onChange={(v) => setEditForm({ ...editForm, monthlySalary: v })} />
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Opening balance (₹)</label>
                <Input
                  value={editForm.openingBalance}
                  onChange={(e) => setEditForm({ ...editForm, openingBalance: e.target.value.replace(/[^0-9.\-]/g, '') })}
                  inputMode="decimal"
                />
                <p className="text-[11px] text-muted-foreground">
                  Carry-over from old system. <strong>+</strong> = owed at migration. <strong>−</strong> = advance given.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editForm.active} onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })} />
                Active
              </label>
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={saveInfo}>
                  <Save className="h-4 w-4 mr-2" /> Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {tab === 'attendance' && (
        <AttendanceGrid
          monthString={attendanceMonth}
          setMonthString={setAttendanceMonth}
          attendance={attendance}
          loading={attendanceLoading}
          onToggle={toggleAttendance}
          onMark={adminMarkOnDate}
        />
      )}

      {tab === 'payments' && (
        <PaymentsView
          payments={payments}
          summary={salarySummary}
          loading={paymentsLoading}
          onReverse={reversePayment}
        />
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="col-span-2">{value}</div>
    </div>
  )
}

function LabelledInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function AttendanceGrid({
  monthString,
  setMonthString,
  attendance,
  loading,
  onToggle,
  onMark,
}: {
  monthString: string
  setMonthString: (s: string) => void
  attendance: Attendance[]
  loading: boolean
  onToggle: (r: Attendance) => void
  onMark: (dateStr: string, status: 'PRESENT' | 'ABSENT') => void
}) {
  const monthInfo = useMemo(() => parseMonthString(monthString), [monthString])
  const recordsByDate = useMemo(() => {
    const map = new Map<string, Attendance>()
    for (const r of attendance) {
      map.set(toDateStringIST(new Date(r.date)), r)
    }
    return map
  }, [attendance])

  const days: { dateStr: string; label: number; record?: Attendance }[] = []
  const cursor = new Date(monthInfo.start)
  while (cursor < monthInfo.end) {
    const dateStr = toDateStringIST(cursor)
    days.push({ dateStr, label: cursor.getUTCDate(), record: recordsByDate.get(dateStr) })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  function shiftMonth(delta: number) {
    const [y, m] = monthString.split('-').map(Number)
    const next = new Date(Date.UTC(y, m - 1 + delta, 1))
    const ny = next.getUTCFullYear()
    const nm = String(next.getUTCMonth() + 1).padStart(2, '0')
    setMonthString(`${ny}-${nm}`)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => shiftMonth(-1)}>
          ←
        </Button>
        <div className="font-medium text-sm flex-1 text-center">{monthString}</div>
        <Button size="sm" variant="outline" onClick={() => shiftMonth(1)}>
          →
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">
        Tap a green/red cell to flip status (will be marked as modified). Tap a grey cell to mark present.
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {days.map(({ dateStr, label, record }) => {
            const present = record?.status === 'PRESENT' && record.approved
            const absent = record?.status === 'ABSENT' && record.approved
            const pending = record && !record.approved
            return (
              <button
                key={dateStr}
                onClick={() => {
                  if (record) onToggle(record)
                  else onMark(dateStr, 'PRESENT')
                }}
                className={cn(
                  'aspect-square rounded text-xs flex flex-col items-center justify-center relative',
                  present && 'bg-green-500/15 text-green-700 hover:bg-green-500/25',
                  absent && 'bg-red-500/15 text-red-700 hover:bg-red-500/25',
                  pending && 'bg-amber-500/20 text-amber-800 hover:bg-amber-500/30',
                  !record && 'bg-muted/40 text-muted-foreground hover:bg-muted'
                )}
                title={
                  record
                    ? `${record.status} via ${SOURCE_LABEL[record.source]}${record.modified ? ' (modified)' : ''}`
                    : 'No record — click to mark present'
                }
              >
                <span className="font-medium">{label}</span>
                {record && (
                  <span className="text-[8px] uppercase">{SOURCE_LABEL[record.source]}</span>
                )}
                {record?.modified && (
                  <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 bg-purple-500 rounded-full" />
                )}
              </button>
            )
          })}
        </div>
      )}

      <div className="text-xs flex flex-wrap gap-3 pt-2 border-t">
        <Legend color="bg-green-500/15" label="Present" />
        <Legend color="bg-red-500/15" label="Absent" />
        <Legend color="bg-amber-500/20" label="Pending self-mark" />
        <Legend color="bg-muted" label="No record" />
        <Legend dot="bg-purple-500" label="Modified" />
      </div>
    </div>
  )
}

function Legend({ color, dot, label }: { color?: string; dot?: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {color && <span className={cn('h-3 w-3 rounded', color)} />}
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />}
      <span className="text-muted-foreground">{label}</span>
    </span>
  )
}

function PaymentsView({
  payments,
  summary,
  loading,
  onReverse,
}: {
  payments: Payment[]
  summary: { totalEarned: string; totalPaid: string; balance: string } | null
  loading: boolean
  onReverse: (paymentId: string, amount: string) => void
}) {
  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Total earned" value={`₹${formatCurrency(Number(summary.totalEarned))}`} />
          <Stat label="Total paid" value={`₹${formatCurrency(Number(summary.totalPaid))}`} />
          <Stat
            label="Balance"
            value={`₹${formatCurrency(Math.abs(Number(summary.balance)))}`}
            tone={Number(summary.balance) >= 0 ? 'positive' : 'negative'}
            sublabel={Number(summary.balance) >= 0 ? 'Pending' : 'Overpaid'}
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : payments.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground text-center">No payments yet.</Card>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <Card key={p.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-sm font-medium inline-flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" /> {p.monthString}
                  <span
                    className={cn(
                      'text-[10px] uppercase font-medium px-1.5 py-0.5 rounded',
                      p.type === 'BONUS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {p.type}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {p.daysAttended}/{p.daysInMonth} days · suggested ₹{formatCurrency(Number(p.calculatedAmount))} · paid {new Date(p.paidDate).toLocaleDateString('en-IN')}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium inline-flex items-center">
                  <IndianRupee className="h-3.5 w-3.5" />
                  {formatCurrency(Number(p.amountPaid))}
                </span>
                <Button size="sm" variant="outline" onClick={() => onReverse(p.id, p.amountPaid)}>
                  <Undo2 className="h-3.5 w-3.5 mr-1" /> Reverse
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
  sublabel,
}: {
  label: string
  value: string
  tone?: 'positive' | 'negative'
  sublabel?: string
}) {
  return (
    <Card
      className={cn(
        'p-3',
        tone === 'positive' && 'border-amber-300 bg-amber-50',
        tone === 'negative' && 'border-blue-300 bg-blue-50'
      )}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
      {sublabel && <div className="text-[10px] uppercase text-muted-foreground">{sublabel}</div>}
    </Card>
  )
}
