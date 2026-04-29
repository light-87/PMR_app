'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'
import { InstallAppButton } from '@/components/InstallAppButton'
import { Loader2, ArrowLeft } from 'lucide-react'

export default function StaffLoginPage() {
  const router = useRouter()
  const { setRole, setEmployee } = useAuthStore()
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isValid = /^\d{7,15}$/.test(phone) && /^\d{4}$/.test(pin)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error || 'Invalid login')
        setPin('')
        return
      }
      setRole('EMPLOYEE')
      setEmployee(json.data.id)
      window.location.href = '/staff'
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <Card>
          <CardHeader className="text-center">
            <img
              src="/logo.png"
              alt="PMR Industries"
              className="mx-auto mb-3 h-20 w-auto object-contain"
            />
            <CardTitle className="text-2xl">Employee Login</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Enter your phone number and 4-digit PIN
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 15))}
                  placeholder="9876543210"
                  className="h-12"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pin">PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="text-center text-2xl tracking-[0.5em] h-14"
                  autoComplete="off"
                />
              </div>
              {error && <p className="text-sm text-red-600 text-center">{error}</p>}
              <Button type="submit" disabled={!isValid || loading} className="w-full h-11">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Logging in…
                  </>
                ) : (
                  'Log in'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        <InstallAppButton />
      </div>
    </div>
  )
}
