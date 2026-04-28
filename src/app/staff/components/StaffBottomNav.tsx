'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, ClipboardCheck, IndianRupee } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/staff', label: 'Home', icon: Home, exact: true },
  { href: '/staff/attendance', label: 'History', icon: Calendar },
  { href: '/staff/mark', label: 'Mark', icon: ClipboardCheck },
  { href: '/staff/salary', label: 'Salary', icon: IndianRupee },
]

export function StaffBottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-background z-50">
      <div className="container max-w-md mx-auto grid grid-cols-4 gap-0">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 py-2.5 text-[11px]',
                active ? 'text-primary font-medium' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
