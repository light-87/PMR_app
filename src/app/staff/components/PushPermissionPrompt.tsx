'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Bell, X, Loader2 } from 'lucide-react'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

const DISMISS_KEY = 'staff.push.dismissed'

// Asks for notification permission on first visit. Hidden if granted, blocked, or
// dismissed. Re-shows after browser/OS revokes permission (subscription becomes null).
export function PushPermissionPrompt() {
  const [shown, setShown] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return
    if (Notification.permission === 'granted') {
      // Verify we have a stored subscription server-side; if not, re-subscribe silently.
      void resubscribeSilentlyIfNeeded().catch(() => {})
      return
    }
    if (Notification.permission === 'denied') return
    if (window.localStorage.getItem(DISMISS_KEY)) return
    setShown(true)
  }, [])

  async function subscribe() {
    setBusy(true)
    setError('')
    try {
      const reg = await navigator.serviceWorker.ready
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setError('Permission denied. Enable from browser settings to receive salary alerts.')
        return
      }
      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapid) {
        setError('Push not configured (missing VAPID key).')
        return
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
      })
      const res = await fetch('/api/staff/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error || 'Server failed to save subscription')
        return
      }
      setShown(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, '1')
    setShown(false)
  }

  if (!shown) return null

  return (
    <Card className="border-primary/30 bg-primary/5 mb-4">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <Bell className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="flex-1 text-sm">
            <div className="font-medium">Get notified when salary is paid</div>
            <div className="text-xs text-muted-foreground">
              Allow notifications to know the moment your salary is credited.
            </div>
          </div>
          <button onClick={dismiss} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button onClick={subscribe} disabled={busy} size="sm">
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bell className="h-4 w-4 mr-2" />}
            Allow
          </Button>
          <Button onClick={dismiss} variant="ghost" size="sm">
            Not now
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

async function resubscribeSilentlyIfNeeded() {
  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  if (existing) {
    // Refresh server copy in case it expired or device changed.
    await fetch('/api/staff/push-subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(existing),
    }).catch(() => {})
    return
  }
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapid) return
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
  })
  await fetch('/api/staff/push-subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub),
  }).catch(() => {})
}
