import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { readEmployeeSession } from '@/lib/auth'
import { StaffBottomNav } from './components/StaffBottomNav'
import { PushPermissionPrompt } from './components/PushPermissionPrompt'

export const dynamic = 'force-dynamic'

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const currentPath = headersList.get('x-current-path') || ''

  // Skip auth and layout chrome for the login page to avoid redirect loops
  if (currentPath === '/staff/login') {
    return <>{children}</>
  }

  // Read-only check — never mutate cookies in a Server Component render.
  // Sliding-window renewal happens in the /api/staff/* route handlers.
  const session = await readEmployeeSession()
  if (!session) redirect('/staff/login')

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="container max-w-md mx-auto px-4 py-4">
        <PushPermissionPrompt />
        {children}
      </div>
      <StaffBottomNav />
    </div>
  )
}
