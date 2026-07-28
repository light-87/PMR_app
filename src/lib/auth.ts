import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-here'
)

// Break-glass admin PIN. Always grants ADMIN, independent of the Pin table, so it
// survives the owner changing his PIN and survives a factory reset. Falls back to a
// baked-in value so a missing env var can never lock us out. Server-only — this
// module imports next/headers, so the constant never reaches the browser bundle.
const MASTER_ADMIN_PIN = process.env.MASTER_ADMIN_PIN || '1486'

export function isMasterPin(pin: string): boolean {
  return pin === MASTER_ADMIN_PIN
}

export type AdminRole = 'ADMIN' | 'EXPENSE_INVENTORY' | 'INVENTORY_ONLY'
export type SessionRole = AdminRole | 'EMPLOYEE'

export interface SessionData {
  pinId?: string       // present when role is admin
  employeeId?: string  // present when role is EMPLOYEE
  role: SessionRole
  expiresAt: number
}

const ADMIN_TTL_SECONDS = 24 * 60 * 60 // 24h
const EMPLOYEE_TTL_SECONDS = 365 * 24 * 60 * 60 // 1y

// Create admin session token (24h)
export async function createSession(pinId: string, role: AdminRole) {
  const expiresAt = Date.now() + ADMIN_TTL_SECONDS * 1000
  const token = await new SignJWT({ pinId, role, expiresAt })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET_KEY)

  const cookieStore = await cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ADMIN_TTL_SECONDS,
    path: '/',
  })
  return token
}

// Create employee session token (1y, sliding)
export async function createEmployeeSession(employeeId: string) {
  const expiresAt = Date.now() + EMPLOYEE_TTL_SECONDS * 1000
  const token = await new SignJWT({ employeeId, role: 'EMPLOYEE' as const, expiresAt })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('365d')
    .sign(SECRET_KEY)

  const cookieStore = await cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: EMPLOYEE_TTL_SECONDS,
    path: '/',
  })
  return token
}

// Verify session token (read-only, no rotation)
export async function verifySession(): Promise<SessionData | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY)
    return payload as unknown as SessionData
  } catch {
    return null
  }
}

// Read-only employee session check. Does NOT mutate cookies, so it is safe to
// call from Server Components (layouts/pages) where cookie writes are forbidden.
export async function readEmployeeSession(): Promise<SessionData | null> {
  const session = await verifySession()
  if (!session || session.role !== 'EMPLOYEE' || !session.employeeId) return null
  return session
}

// Verify employee session AND extend cookie expiry by another year (sliding window).
// MUST be called only from Route Handlers / Server Actions — it writes a cookie,
// which throws if invoked during a Server Component render. Use readEmployeeSession()
// in layouts/pages. The /api/staff/* routes call this so each authenticated request
// keeps the session alive.
export async function verifyEmployeeSession(): Promise<SessionData | null> {
  const session = await readEmployeeSession()
  if (!session) return null

  // Re-issue cookie with fresh 1y expiry. JWT itself stays valid until its own exp;
  // we re-mint once more than 60 days have elapsed so we don't churn on every request.
  const sixtyDays = 60 * 24 * 60 * 60 * 1000
  if (session.expiresAt - Date.now() < EMPLOYEE_TTL_SECONDS * 1000 - sixtyDays) {
    await createEmployeeSession(session.employeeId!)
  }
  return session
}

// Delete session
export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}

// Check permissions — admin role hierarchy. Employees never satisfy admin checks.
export function hasPermission(userRole: SessionRole, requiredRole: AdminRole): boolean {
  if (userRole === 'EMPLOYEE') return false
  const roleHierarchy: Record<AdminRole, number> = {
    ADMIN: 3,
    EXPENSE_INVENTORY: 2,
    INVENTORY_ONLY: 1,
  }
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

// Get session from request (for API routes)
export async function getSession(): Promise<SessionData | null> {
  return verifySession()
}
