'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Loader2, UserPlus, Phone, IndianRupee } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type Employee = {
  id: string
  name: string
  phone: string
  monthlySalary: string
  joinedDate: string
  active: boolean
  faceDescriptorCount: number
}

export default function EmployeeListPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)

  useEffect(() => {
    void load()
  }, [includeInactive])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const url = includeInactive ? '/api/employee?includeInactive=true' : '/api/employee'
      const res = await fetch(url)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed')
      setEmployees(json.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  const filtered = employees.filter(
    (e) =>
      !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.phone.includes(search)
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <h1 className="text-xl font-bold">Employees</h1>
        <Link href="/employee/new">
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-sm"
        />
        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground px-2">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          Include inactive
        </label>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {employees.length === 0 ? 'No employees yet. Add one to get started.' : 'No matches.'}
        </Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map((e) => (
            <Link
              key={e.id}
              href={`/employee/${e.id}`}
              className="block hover:bg-accent/50 transition-colors rounded-lg"
            >
              <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {e.name}
                    {!e.active && (
                      <span className="text-[10px] uppercase font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 mt-0.5">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {e.phone}
                    </span>
                    <span>{e.faceDescriptorCount} face sample{e.faceDescriptorCount === 1 ? '' : 's'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Monthly salary</div>
                  <div className="font-medium inline-flex items-center">
                    <IndianRupee className="h-3.5 w-3.5" />
                    {formatCurrency(Number(e.monthlySalary))}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
