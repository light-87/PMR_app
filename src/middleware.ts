import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-here'
)

// Public paths that never require a session.
const publicRoutes = ['/login', '/staff/login', '/']

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Allow public routes
  if (publicRoutes.includes(path)) {
    const response = NextResponse.next()
    response.headers.set('x-current-path', path)
    return response
  }

  // Allow API routes to handle their own auth
  if (path.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Get session token
  const token = request.cookies.get('session')?.value

  // Determine where to redirect on missing session — staff routes go to staff login.
  const isStaffRoute = path.startsWith('/staff')
  const loginUrl = new URL(isStaffRoute ? '/staff/login' : '/login', request.url)

  if (!token) {
    return NextResponse.redirect(loginUrl)
  }

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY)
    const role = payload.role as string

    // /staff/* — EMPLOYEE only. Send mismatched roles to admin home.
    if (isStaffRoute) {
      if (role !== 'EMPLOYEE') {
        return NextResponse.redirect(new URL('/inventory', request.url))
      }
      return NextResponse.next()
    }

    // /employee/* — ADMIN gets full access; EXPENSE_INVENTORY gets kiosk, pending & today only.
    if (path.startsWith('/employee')) {
      if (role === 'ADMIN') {
        return NextResponse.next()
      }
      if (role === 'EXPENSE_INVENTORY') {
        const allowedSubPaths = ['/employee/kiosk', '/employee/pending', '/employee/today']
        if (allowedSubPaths.some(p => path.startsWith(p))) {
          return NextResponse.next()
        }
        // Redirect to kiosk for any other /employee/* path
        return NextResponse.redirect(new URL('/employee/kiosk', request.url))
      }
      // Employees and others bounce to their respective home.
      if (role === 'EMPLOYEE') return NextResponse.redirect(new URL('/staff', request.url))
      return NextResponse.redirect(new URL('/inventory', request.url))
    }

    // Existing admin-only routes
    if (path.startsWith('/admin') || path.startsWith('/dashboard') || path.startsWith('/statements') || path.startsWith('/ai-lab')) {
      if (role !== 'ADMIN') {
        if (role === 'EMPLOYEE') return NextResponse.redirect(new URL('/staff', request.url))
        return NextResponse.redirect(new URL('/inventory', request.url))
      }
    }

    // Expense routes - require ADMIN or EXPENSE_INVENTORY
    if (path.startsWith('/expenses')) {
      if (role === 'INVENTORY_ONLY') {
        return NextResponse.redirect(new URL('/inventory', request.url))
      }
      if (role === 'EMPLOYEE') {
        return NextResponse.redirect(new URL('/staff', request.url))
      }
    }

    // Other authenticated admin pages — block employees so they don't wander.
    if (role === 'EMPLOYEE') {
      return NextResponse.redirect(new URL('/staff', request.url))
    }

    const response = NextResponse.next()
    response.headers.set('x-current-path', path)
    return response
  } catch {
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  // `deck` is excluded so the public AdBlue/DEF slide deck stays shareable
  // without a session. It contains no customer data.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|logo.png|manifest.json|sw.js|models|deck).*)'],
}
