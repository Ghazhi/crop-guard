import { NextRequest, NextResponse } from 'next/server'

const ROLE_HOME: Record<string, string> = {
  staff:       '/dashboard/Dashboard',
  partner:     '/dashboard/PartnerPortal',
  finance:     '/dashboard/FinancePortal',
  pm:          '/dashboard/ProgramManager',
  super_admin: '/superadmin',
}

function parseSession(req: NextRequest): { role: string } | null {
  const cookie = req.cookies.get('cropguard_session')
  if (!cookie) return null
  try {
    return JSON.parse(atob(cookie.value))
  } catch {
    return null
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const session = parseSession(req)

  // Root → authenticated users go straight to their dashboard; logged-out users see the landing page
  if (pathname === '/') {
    if (session) {
      return NextResponse.redirect(new URL(ROLE_HOME[session.role] ?? '/dashboard/Dashboard', req.url))
    }
    return NextResponse.next()
  }

  // Login page → authenticated users go straight to their dashboard
  if (pathname === '/login') {
    if (session) {
      const home = ROLE_HOME[session.role] ?? '/dashboard/Dashboard'
      return NextResponse.redirect(new URL(home, req.url))
    }
    return NextResponse.next()
  }

  // All /dashboard routes require a session
  if (pathname.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    const role = session.role

    // Partner-only routes
    if (pathname.startsWith('/dashboard/PartnerPortal') && role !== 'partner') {
      return NextResponse.redirect(new URL(ROLE_HOME[role] ?? '/login', req.url))
    }

    // Finance-only routes
    if (pathname.startsWith('/dashboard/FinancePortal') && role !== 'finance') {
      return NextResponse.redirect(new URL(ROLE_HOME[role] ?? '/login', req.url))
    }

    // PM-only routes
    if (pathname.startsWith('/dashboard/ProgramManager') && role !== 'pm') {
      return NextResponse.redirect(new URL(ROLE_HOME[role] ?? '/login', req.url))
    }

    // Routes shared between staff and partner
    const PARTNER_SHARED = ['/dashboard/PartnerDirectory', '/dashboard/PartnerContacts']
    const isPartnerShared = PARTNER_SHARED.some(r => pathname.startsWith(r))

    // Staff-only routes (everything that's not a portal or shared partner route)
    const isPortal = pathname.startsWith('/dashboard/PartnerPortal')
                  || pathname.startsWith('/dashboard/FinancePortal')
                  || pathname.startsWith('/dashboard/ProgramManager')
    if (!isPortal && !isPartnerShared && role !== 'staff') {
      return NextResponse.redirect(new URL(ROLE_HOME[role] ?? '/login', req.url))
    }
  }

  // Super Admin — a platform-operator role that manages tenants, kept in its
  // own top-level route space, entirely separate from /dashboard/* portals
  if (pathname.startsWith('/superadmin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    if (session.role !== 'super_admin') {
      return NextResponse.redirect(new URL(ROLE_HOME[session.role] ?? '/login', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/login', '/dashboard/:path*', '/superadmin/:path*'],
}
