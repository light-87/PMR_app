'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { FaceCaptureWebcam } from '../components/FaceCaptureWebcam'

export default function NewEmployeePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [monthlySalary, setMonthlySalary] = useState('')
  const [descriptors, setDescriptors] = useState<number[][]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const isValid =
    name.trim().length > 0 &&
    /^\d{7,15}$/.test(phone) &&
    /^\d{4}$/.test(pin) &&
    !!parseFloat(monthlySalary) &&
    parseFloat(monthlySalary) > 0

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) {
      setError('Fill all required fields correctly')
      return
    }
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone,
          pin,
          monthlySalary: parseFloat(monthlySalary),
          faceDescriptors: descriptors.length > 0 ? descriptors : undefined,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error || 'Failed')
        return
      }
      router.push(`/employee/${json.data.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <Link
        href="/employee"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <h1 className="text-xl font-bold">Add Employee</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone (digits only)</Label>
                <Input
                  id="phone"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 15))}
                  placeholder="9876543210"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pin">4-digit PIN</Label>
                <Input
                  id="pin"
                  inputMode="numeric"
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="salary">Monthly salary (₹)</Label>
                <Input
                  id="salary"
                  inputMode="decimal"
                  value={monthlySalary}
                  onChange={(e) => setMonthlySalary(e.target.value)}
                  placeholder="15000"
                  required
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" disabled={!isValid || busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Employee
              {descriptors.length > 0 ? ` + ${descriptors.length} face samples` : ''}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Face capture (optional, recommended)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Capture once now so the kiosk recognises this employee. You can skip this and add it
            later from the employee detail page.
          </p>
        </CardHeader>
        <CardContent>
          <FaceCaptureWebcam
            onCaptured={(d) => setDescriptors((prev) => [...prev, ...d])}
            buttonLabel="Capture 3 frames"
          />
          {descriptors.length > 0 && (
            <p className="text-xs text-green-700 mt-3">
              ✓ {descriptors.length} face sample{descriptors.length === 1 ? '' : 's'} ready to save with this employee.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
