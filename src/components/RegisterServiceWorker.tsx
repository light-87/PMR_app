'use client'

import { useEffect } from 'react'

// Registers /sw.js once per session. Push events from the server are handled by the
// service worker itself (see public/sw.js).
export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      } catch (err) {
        // Don't surface — SW failure shouldn't break the app.
        console.warn('SW registration failed', err)
      }
    }

    void register()
  }, [])

  return null
}
