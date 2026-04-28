import { redirect } from 'next/navigation'
import { verifyEmployeeSession } from '@/lib/auth'
import { StaffBottomNav } from './components/StaffBottomNav'
import { PushPermissionPrompt } from './components/PushPermissionPrompt'

export const dynamic = 'force-dynamic'

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
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
