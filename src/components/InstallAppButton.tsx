'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Smartphone, Apple } from 'lucide-react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: InstallPromptEvent
  }
}

// Detect already-installed (display-mode: standalone) so we hide the button there.
function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari has its own bool
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent) && !('MSStream' in window)
}

export function InstallAppButton() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [showIOSHelp, setShowIOSHelp] = useState(false)
  const [showAndroidHelp, setShowAndroidHelp] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true)
      return
    }

    const onBefore = (e: InstallPromptEvent) => {
      e.preventDefault()
      setDeferred(e)
    }
    const onInstalled = () => setInstalled(true)

    window.addEventListener('beforeinstallprompt', onBefore)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBefore)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null

  async function handleClick() {
    if (deferred) {
      setBusy(true)
      try {
        await deferred.prompt()
        const choice = await deferred.userChoice
        if (choice.outcome === 'accepted') {
          setInstalled(true)
        }
        setDeferred(null)
      } finally {
        setBusy(false)
      }
      return
    }
    // No native prompt — show OS-specific instructions.
    if (isIOS()) {
      setShowIOSHelp((s) => !s)
    } else {
      setShowAndroidHelp((s) => !s)
    }
  }

  return (
    <Card className="border-dashed">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Smartphone className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <div className="font-medium text-sm">📱 Install App</div>
            <div className="text-xs text-muted-foreground">
              Add to home screen for fast access and notifications.
            </div>
          </div>
        </div>
        <Button onClick={handleClick} disabled={busy} className="w-full" variant="outline">
          {deferred ? 'Install Now' : isIOS() ? 'Show iOS instructions' : 'Show install help'}
        </Button>

        {showIOSHelp && (
          <div className="text-xs text-muted-foreground space-y-2 rounded-md bg-muted/40 p-3">
            <div className="inline-flex items-center gap-1.5 font-medium">
              <Apple className="h-3.5 w-3.5" /> On iPhone / iPad (Safari)
            </div>
            <ol className="list-decimal pl-5 space-y-0.5">
              <li>Tap the Share button (square with arrow) at the bottom.</li>
              <li>Scroll and tap <strong>&quot;Add to Home Screen&quot;</strong>.</li>
              <li>Tap <strong>Add</strong> in the top right.</li>
            </ol>
          </div>
        )}

        {showAndroidHelp && (
          <div className="text-xs text-muted-foreground space-y-1 rounded-md bg-muted/40 p-3">
            <div className="font-medium">On Android (Chrome)</div>
            <ol className="list-decimal pl-5 space-y-0.5">
              <li>Tap the ⋮ menu (top right).</li>
              <li>Tap <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.</li>
              <li>Tap <strong>Install</strong>.</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
