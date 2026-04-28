// Server-side Web Push helper. Wraps the `web-push` lib with VAPID keys.
import webpush from 'web-push'

let configured = false

function configure() {
  if (configured) return
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) {
    throw new Error('VAPID keys not configured. Run `npx web-push generate-vapid-keys` and set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT in .env.local')
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
}

export type PushSubscriptionJSON = {
  endpoint: string
  keys: { p256dh: string; auth: string }
  expirationTime?: number | null
}

export type PushPayload = {
  title: string
  body: string
  url?: string // where the SW should open on click
  tag?: string
}

export type PushResult =
  | { ok: true }
  | { ok: false; expired: true; statusCode: number } // subscription gone, caller should null it out
  | { ok: false; expired: false; error: string }

export async function sendPush(
  subscription: PushSubscriptionJSON,
  payload: PushPayload
): Promise<PushResult> {
  configure()
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload))
    return { ok: true }
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string }
    const status = e.statusCode ?? 0
    if (status === 404 || status === 410) {
      return { ok: false, expired: true, statusCode: status }
    }
    return { ok: false, expired: false, error: e.message ?? 'unknown push error' }
  }
}
