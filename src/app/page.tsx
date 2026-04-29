import { redirect } from 'next/navigation'
import Link from 'next/link'
import { verifySession } from '@/lib/auth'
import { Card } from '@/components/ui/card'
import { UserCog, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

// Smart router: existing session → role-appropriate home; no session → chooser screen.
// Manifest's start_url points here, so installed-PWA opens map to either flow.
export default async function Home() {
  const session = await verifySession()
  if (session?.role === 'EMPLOYEE') redirect('/staff')
  if (session?.role) redirect('/stockboard')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center mb-2">
          <img
            src="/logo.png"
            alt="PMR Industries"
            className="mx-auto mb-3 h-20 w-auto object-contain"
          />
          <h1 className="text-2xl font-bold">PMR Industries</h1>
          <p className="text-sm text-muted-foreground mt-1">Choose how you want to log in</p>
        </div>

        <Link href="/login" className="block">
          <Card className="p-5 hover:bg-accent/50 hover:border-primary/40 transition-colors cursor-pointer flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <UserCog className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Admin / Staff Login</div>
              <div className="text-xs text-muted-foreground">
                4-digit PIN — for owners, managers, and inventory staff
              </div>
            </div>
            <span aria-hidden className="text-xl text-muted-foreground">→</span>
          </Card>
        </Link>

        <Link href="/staff/login" className="block">
          <Card className="p-5 hover:bg-accent/50 hover:border-primary/40 transition-colors cursor-pointer flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Employee Login</div>
              <div className="text-xs text-muted-foreground">
                Phone + 4-digit PIN — for attendance and salary tracking
              </div>
            </div>
            <span aria-hidden className="text-xl text-muted-foreground">→</span>
          </Card>
        </Link>

        <p className="text-xs text-center text-muted-foreground pt-4">
          Tip: install this app to your home screen for the best experience.
        </p>
      </div>
    </div>
  )
}
