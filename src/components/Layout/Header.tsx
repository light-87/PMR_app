'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import {
  Menu,
  X,
  LogOut,
  LayoutGrid,
  Package,
  ClipboardList,
  Users,
  IndianRupee,
  Search as SearchIcon,
  LayoutDashboard,
  BarChart3,
  FileText,
  Sparkles,
  Settings,
  UserCog,
  type LucideIcon,
} from 'lucide-react'

type NavItem = {
  href: string
  label: string
  roles: string[]
  icon: LucideIcon
}

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { role, clearAuth } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      clearAuth()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const navItems: NavItem[] = [
    { href: '/stockboard', label: 'StockBoard', roles: ['ADMIN', 'EXPENSE_INVENTORY', 'INVENTORY_ONLY'], icon: LayoutGrid },
    { href: '/inventory', label: 'Inventory', roles: ['ADMIN', 'EXPENSE_INVENTORY', 'INVENTORY_ONLY'], icon: Package },
    { href: '/daily-report', label: 'Daily Report', roles: ['ADMIN', 'EXPENSE_INVENTORY', 'INVENTORY_ONLY'], icon: ClipboardList },
    { href: '/leads', label: 'Leads', roles: ['ADMIN', 'EXPENSE_INVENTORY'], icon: Users },
    { href: '/expenses', label: 'Expenses', roles: ['ADMIN', 'EXPENSE_INVENTORY'], icon: IndianRupee },
    { href: '/search', label: 'Search', roles: ['ADMIN', 'EXPENSE_INVENTORY'], icon: SearchIcon },
    { href: '/dashboard', label: 'Dashboard', roles: ['ADMIN'], icon: LayoutDashboard },
    { href: '/inventory-dashboard', label: 'Inventory Dashboard', roles: ['ADMIN'], icon: BarChart3 },
    { href: '/statements', label: 'Statements', roles: ['ADMIN'], icon: FileText },
    { href: '/ai-lab', label: 'AI Lab', roles: ['ADMIN'], icon: Sparkles },
    { href: '/admin', label: 'Admin', roles: ['ADMIN'], icon: Settings },
    { href: '/employee', label: 'Employee', roles: ['ADMIN', 'EXPENSE_INVENTORY'], icon: UserCog },
  ]

  // EXPENSE_INVENTORY should land on kiosk, not the employee list
  const adjustedNavItems = navItems.map(item => {
    if (item.href === '/employee' && role === 'EXPENSE_INVENTORY') {
      return { ...item, href: '/employee/kiosk' }
    }
    return item
  })

  const visibleNavItems = adjustedNavItems.filter(item =>
    role && item.roles.includes(role)
  )

  return (
    <>
      {/* Mobile top-bar + drawer (hidden on desktop) */}
      <header className="md:hidden sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href="/inventory" className="flex items-center" aria-label="PMR Industries home">
            <img
              src="/logo.png"
              alt="PMR Industries"
              className="h-9 w-auto object-contain"
            />
          </Link>

          <div className="flex items-center gap-2">
            {role && (
              <span className="hidden sm:inline-block text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                {role.replace('_', ' ')}
              </span>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t">
            <nav className="container flex flex-col p-4 gap-1">
              {visibleNavItems.map((item) => {
                const Icon = item.icon
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                )
              })}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="justify-start mt-2"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </nav>
          </div>
        )}
      </header>

      {/* Desktop side rail — hover-to-expand (hidden on mobile) */}
      <aside
        aria-label="Primary"
        className={cn(
          'hidden md:flex group/rail fixed inset-y-0 left-0 z-50 flex-col',
          'w-16 hover:w-60 transition-[width] duration-200 ease-out',
          'border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
          'overflow-hidden shadow-sm hover:shadow-xl'
        )}
      >
        {/* Logo block */}
        <Link
          href="/inventory"
          className="flex items-center gap-3 h-16 px-3 shrink-0 border-b"
          aria-label="PMR Industries home"
        >
          <img
            src="/logo.png"
            alt=""
            className="h-9 w-9 object-contain shrink-0"
          />
          <span
            className={cn(
              'text-sm font-bold whitespace-nowrap',
              'opacity-0 group-hover/rail:opacity-100 transition-opacity duration-150',
              'pointer-events-none'
            )}
          >
            PMR Industries
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-1 px-2 py-3 overflow-y-auto overflow-x-hidden">
          {visibleNavItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 h-11 px-3 rounded-md transition-colors relative',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span
                  className={cn(
                    'text-sm font-medium whitespace-nowrap',
                    'opacity-0 group-hover/rail:opacity-100 transition-opacity duration-150',
                    'pointer-events-none'
                  )}
                >
                  {item.label}
                </span>
                {active && (
                  <span
                    className={cn(
                      'ml-auto h-1.5 w-1.5 rounded-full bg-primary',
                      'opacity-0 group-hover/rail:opacity-100 transition-opacity duration-150'
                    )}
                    aria-hidden
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="mt-auto border-t px-2 py-3 flex flex-col gap-1">
          {role && (
            <span
              className={cn(
                'text-[10px] font-semibold tracking-wide uppercase text-muted-foreground px-3 whitespace-nowrap',
                'opacity-0 group-hover/rail:opacity-100 transition-opacity duration-150'
              )}
            >
              {role.replace('_', ' ')}
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
            className="flex items-center gap-3 h-11 px-3 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span
              className={cn(
                'text-sm font-medium whitespace-nowrap',
                'opacity-0 group-hover/rail:opacity-100 transition-opacity duration-150',
                'pointer-events-none'
              )}
            >
              Logout
            </span>
          </button>
        </div>
      </aside>
    </>
  )
}
