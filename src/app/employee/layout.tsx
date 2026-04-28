'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ProtectedLayout } from '@/components/Layout/ProtectedLayout'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, Camera, Clock, IndianRupee } from 'lucide-react'

const subNav = [
  { href: '/employee/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/employee', label: 'Employees', icon: Users, exact: true },
  { href: '/employee/kiosk', label: 'Kiosk', icon: Camera },
  { href: '/employee/pending', label: 'Pending', icon: Clock },
  { href: '/employee/payroll', label: 'Payroll', icon: IndianRupee },
]

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <ProtectedLayout>
      <div className="container mx-auto px-0 py-2 max-w-6xl">
        <nav className="flex gap-1 border-b mb-6 overflow-x-auto -mx-1 px-1">
          {subNav.map((item) => {
            const Icon = item.icon
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-md border-b-2 -mb-px whitespace-nowrap transition-colors',
                  active
                    ? 'border-primary text-primary font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        {children}
      </div>
    </ProtectedLayout>
  )
}
