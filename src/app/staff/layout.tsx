import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { verifyEmployeeSession } from '@/lib/auth'
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

  const session = await verifyEmployeeSession()
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
