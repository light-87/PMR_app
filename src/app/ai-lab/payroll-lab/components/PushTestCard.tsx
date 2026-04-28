'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, BellOff, Send, Loader2 } from 'lucide-react'

type Status = {
  supported: boolean
  permission: NotificationPermission | 'unsupported'
  serverHasSubscription: boolean | null
  swReady: boolean
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export function PushTestCard() {
  const [status, setStatus] = useState<Status>({
    supported: false,
    permission: 'unsupported',
    serverHasSubscription: null,
    swReady: false,
  })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void refresh()
  }, [])

  async function refresh() {
    const supported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    if (!supported) {
      setStatus({ supported: false, permission: 'unsupported', serverHasSubscription: null, swReady: false })
      return
    }

    let swReady = false
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      swReady = !!reg
    } catch {}

    let serverHasSubscription: boolean | null = null
    try {
      const res = await fetch('/api/ai-lab/push-test/subscribe')
      const json = await res.json()
      serverHasSubscription = !!json?.data?.hasSubscription
    } catch {
      serverHasSubscription = null
    }

    setStatus({
      supported: true,
      permission: Notification.permission,
      serverHasSubscription,
      swReady,
    })
  }

  async function subscribe() {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const reg =
        (await navigator.serviceWorker.getRegistration('/sw.js')) ||
        (await navigator.serviceWorker.register('/sw.js'))
      await navigator.serviceWorker.ready

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setError('Permission denied. Allow notifications and try again.')
        return
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        setError('NEXT_PUBLIC_VAPID_PUBLIC_KEY missing in .env.local')
        return
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      })

      const res = await fetch('/api/ai-lab/push-test/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || 'Failed to save subscription on server')
        return
      }
      setMessage('Subscribed. Now tap "Send test push".')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Subscribe failed')
    } finally {
      setBusy(false)
      void refresh()
    }
  }

  async function unsubscribe() {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      const sub = await reg?.pushManager.getSubscription()
      await sub?.unsubscribe()
      await fetch('/api/ai-lab/push-test/subscribe', { method: 'DELETE' })
      setMessage('Unsubscribed.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unsubscribe failed')
    } finally {
      setBusy(false)
      void refresh()
    }
  }

  async function sendTest() {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch('/api/ai-lab/push-test/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'PMR Payroll Lab',
          body: 'Test push delivered ✓',
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(j.error || `Send failed (${res.status})`)
        return
      }
      setMessage('Push sent. Notification should appear shortly.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed')
    } finally {
      setBusy(false)
      void refresh()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" /> Web Push Test
        </CardTitle>
        <CardDescription>
          Install as PWA on phone first, then subscribe. Then send a test from any device — notification
          should appear on the subscribed phone even when the app is closed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-xs space-y-1 rounded-md border bg-muted/30 p-3">
          <div>Browser support: <strong>{status.supported ? 'yes' : 'no'}</strong></div>
          <div>Notification permission: <strong>{status.permission}</strong></div>
          <div>Service worker registered: <strong>{status.swReady ? 'yes' : 'no'}</strong></div>
          <div>Subscription on server: <strong>{status.serverHasSubscription === null ? 'unknown' : status.serverHasSubscription ? 'yes' : 'no'}</strong></div>
        </div>

        {!status.supported && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
            This browser doesn&apos;t support Web Push. Try Chrome on Android.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={subscribe} disabled={busy || !status.supported}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bell className="h-4 w-4 mr-2" />}
            Subscribe to test push
          </Button>
          <Button onClick={sendTest} disabled={busy || !status.serverHasSubscription} variant="secondary">
            <Send className="h-4 w-4 mr-2" /> Send me a test notification
          </Button>
          <Button onClick={unsubscribe} disabled={busy || !status.serverHasSubscription} variant="outline">
            <BellOff className="h-4 w-4 mr-2" /> Unsubscribe
          </Button>
        </div>

        {message && <p className="text-xs text-green-700">{message}</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </CardContent>
    </Card>
  )
}
