'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, Building2, UserCog, TrendingUp,
  Zap, ShieldAlert, BarChart2, SlidersHorizontal, Globe2,
  Menu, X, LogOut, ChevronRight, PanelLeftClose, PanelLeftOpen, Lock,
  Handshake, FileText, PieChart,
  BookOpen, ClipboardList, AlertTriangle,
  CalendarDays, Target, BarChart3, Settings2, Activity, ClipboardCheck,
  FolderKanban, ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import type { UserRole, AuthUser } from '@/app/login/_logics/interface'

// ─── Nav definitions per role ─────────────────────────────────────────────────

type NavLink    = { href: string; label: string; icon: React.ElementType; locked: boolean }
type NavSection = { section: true; label: string }
type NavItem    = NavLink | NavSection

const STAFF_NAV: NavItem[] = [
  { href: '/dashboard/Dashboard',           label: 'Dashboard',            icon: LayoutDashboard,   locked: false },
  { href: '/dashboard/CommunityProfile',    label: 'Community Profile',    icon: Globe2,            locked: false },
  { href: '/dashboard/FarmersRegistry',     label: 'Farmers Registry',     icon: Users,             locked: false },
  { href: '/dashboard/ProgramsSetup',       label: 'Programs Setup',       icon: Building2,         locked: false },
  { href: '/dashboard/AgentAssignment',     label: 'Agent Assignment',     icon: UserCog,           locked: false },
  { href: '/dashboard/FRIDashboard',        label: 'FRI Dashboard',        icon: TrendingUp,        locked: false },
  { href: '/dashboard/OpportunityPathways', label: 'Opportunity Pathways', icon: Zap,               locked: false },
  { href: '/dashboard/RiskIntelligence',    label: 'Risk Intelligence',    icon: ShieldAlert,       locked: false },
  { href: '/dashboard/Reports',             label: 'Reports',              icon: BarChart2,         locked: false },
  { href: '/dashboard/CheckinConfig',       label: 'Check-in Config',      icon: SlidersHorizontal, locked: false },
  { section: true, label: 'Partners' },
  { href: '/dashboard/PartnerDirectory',    label: 'Partners',             icon: Handshake,         locked: false },
]

const PARTNER_NAV: NavItem[] = [
  { href: '/dashboard/PartnerPortal',           label: 'Overview',             icon: LayoutDashboard, locked: false },
  { section: true, label: 'Partner Dashboard' },
  { href: '/dashboard/PartnerPortal/Farmers',   label: 'Linked Programs',      icon: Building2, locked: false },
  { href: '/dashboard/PartnerPortal/Loans',     label: 'Linked Interventions', icon: Zap,       locked: false },
  { href: '/dashboard/PartnerPortal/Repayment', label: 'Risk & Performance',   icon: BarChart2, locked: false },
  { href: '/dashboard/PartnerPortal/Reports',   label: 'Reports',              icon: FileText,  locked: false },
]

const FINANCE_NAV = [
  { href: '/dashboard/FinancePortal',              label: 'Finance Overview',    icon: LayoutDashboard, locked: false },
  { href: '/dashboard/FinancePortal/Analytics',    label: 'Portfolio Analytics', icon: PieChart,        locked: false },
  { href: '/dashboard/FinancePortal/Risk',         label: 'Credit Risk',         icon: AlertTriangle,   locked: false },
  { href: '/dashboard/FinancePortal/Ledger',       label: 'Transaction Ledger',  icon: BookOpen,        locked: false },
  { href: '/dashboard/FinancePortal/Compliance',   label: 'Compliance & Audit',  icon: ClipboardList,   locked: false },
]

const PM_NAV: NavItem[] = [
  { href: '/dashboard/ProgramManager',                   label: 'Overview',              icon: LayoutDashboard, locked: false },
  { section: true, label: 'Programs' },
  { href: '/dashboard/ProgramManager/Programs',          label: 'Programs & Cohorts',    icon: FolderKanban,    locked: false },
  { href: '/dashboard/ProgramManager/Farmers',           label: 'Farmer Management',     icon: Users,           locked: false },
  { href: '/dashboard/ProgramManager/Partners',          label: 'Partners',              icon: Handshake,       locked: false },
  { section: true, label: 'Quality' },
  { href: '/dashboard/ProgramManager/Verification',      label: 'Verification & Review', icon: ShieldCheck,     locked: false },
  { href: '/dashboard/ProgramManager/FRIPerformance',    label: 'FRI & Performance',     icon: Target,          locked: false },
  { section: true, label: 'Operations' },
  { href: '/dashboard/ProgramManager/Interventions',     label: 'Interventions',         icon: Zap,             locked: false },
  { href: '/dashboard/ProgramManager/Reports',           label: 'Reports',               icon: BarChart3,       locked: false },
  { href: '/dashboard/ProgramManager/Settings',          label: 'Settings',              icon: Settings2,       locked: false },
]

// root-level portal links (e.g. '/dashboard/PartnerPortal') should only match their
// exact path — otherwise they'd swallow every sub-route as a prefix match
function navLinkMatches(pathname: string, href: string): boolean {
  const isExactOnly = href.endsWith('/ProgramManager') || href.endsWith('/PartnerPortal') || href.endsWith('/FinancePortal')
  return pathname === href || (!isExactOnly && pathname.startsWith(href + '/'))
}

const ROLE_META: Record<UserRole, { label: string; color: string; navBg: string }> = {
  staff:   { label: 'Staff Portal',           color: 'var(--brand-forest)', navBg: 'var(--brand-forest)' },
  partner: { label: 'Partner Portal',         color: '#1e3a5f',             navBg: '#1e3a5f'             },
  finance: { label: 'Finance Portal',         color: '#7c3a00',             navBg: '#7c3a00'             },
  pm:      { label: 'Program Manager Portal', color: '#312e81',             navBg: '#312e81'             },
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed,  setCollapsed]  = useState(false)
  const [role,       setRole]       = useState<UserRole>('staff')
  const [authUser,   setAuthUser]   = useState<AuthUser>({ name: 'Abena Owusu', initials: 'AO', org: 'CropGuard' })
  const pathname = usePathname()
  const router   = useRouter()

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(session => {
        if (!session) return
        if (session.role) setRole(session.role)
        if (session.user) setAuthUser(session.user)
      })
      .catch(() => {})
  }, [])

  function handleSignOut() {
    fetch('/api/auth/logout', { method: 'POST' }).finally(() => router.push('/login'))
  }

  const nav  = role === 'partner' ? PARTNER_NAV : role === 'finance' ? FINANCE_NAV : role === 'pm' ? PM_NAV : STAFF_NAV
  const meta = ROLE_META[role]

  const sidebarW = collapsed ? 'md:w-16' : 'md:w-60'
  const mainML   = collapsed ? 'md:ml-16' : 'md:ml-60'

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex">
      {mobileOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex flex-col transition-all duration-200',
          'w-60', sidebarW,
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
        style={{ backgroundColor: meta.navBg }}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center border-b border-white/10 h-16 shrink-0',
          collapsed ? 'justify-center px-0' : 'gap-3 px-5'
        )}>
          <div className="w-8 h-8 shrink-0 flex items-center justify-center">
            <svg width="32" height="38" viewBox="0 0 52 62" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M26 0C11.64 0 0 11.64 0 26C0 44.2 26 62 26 62C26 62 52 44.2 52 26C52 11.64 40.36 0 26 0Z" fill="#F5A623"/>
              <circle cx="26" cy="24" r="14" fill="white"/>
              <g transform="translate(19, 15)">
                <line x1="7" y1="18" x2="7" y2="8" stroke="#2C5F3F" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M7 13 C7 13 2 11 2 6 C2 6 7 7 7 13Z" fill="#3D7A56"/>
                <path d="M7 11 C7 11 12 9 12 4 C12 4 7 5 7 11Z" fill="#3D7A56"/>
              </g>
            </svg>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-none">CropGuard</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--brand-pale)' }}>{meta.label}</p>
            </div>
          )}
          <button className="ml-auto md:hidden text-white/60 hover:text-white" onClick={() => setMobileOpen(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
          {nav.map((item) => {
            if ('section' in item) {
              if (collapsed) return null
              return (
                <p key={item.label} className="text-[10px] font-bold uppercase tracking-widest px-3 pt-4 pb-1.5 opacity-40 text-white select-none">
                  {item.label}
                </p>
              )
            }

            const { href, icon: Icon, label, locked } = item
            const isActive = !locked && navLinkMatches(pathname, href)

            if (locked) {
              return (
                <div key={href}
                  className={cn('flex items-center rounded-lg text-sm font-medium cursor-not-allowed opacity-40', collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5')}
                  style={{ color: 'var(--brand-pale)' }}>
                  <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--brand-light)' }} />
                  {!collapsed && <><span className="flex-1">{label}</span><Lock className="w-3 h-3 opacity-70" /></>}
                </div>
              )
            }

            return (
              <Link key={href} href={href}
                title={collapsed ? label : undefined}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center rounded-lg text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
                  isActive ? 'text-white' : 'hover:bg-white/10 hover:text-white',
                )}
                style={isActive ? { backgroundColor: 'rgba(255,255,255,0.18)' } : { color: 'var(--brand-pale)' }}
              >
                <Icon className="w-4 h-4 shrink-0" style={{ color: isActive ? 'white' : 'var(--brand-light)' }} />
                {!collapsed && (
                  <><span className="flex-1">{label}</span>{isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}</>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-white/10 p-3">
          {!collapsed && (
            <div className="flex items-center gap-3 mb-3 px-1">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-white/20">
                <span className="text-white text-xs font-bold">{authUser.initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{authUser.name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--brand-pale)' }}>{authUser.org}</p>
              </div>
            </div>
          )}
          <ButtonTemplate
            variant="ghost" size="sm"
            label={collapsed ? undefined : 'Sign out'}
            isIcon={collapsed}
            leftIcon={<LogOut className="w-3.5 h-3.5 shrink-0" />}
            fullWidth onClick={handleSignOut} title="Sign out"
            className={cn('justify-start hover:bg-white/10 hover:text-white!', collapsed && 'justify-center')}
            style={{ color: 'var(--brand-pale)' }}
          />
        </div>
      </aside>

      {/* Main */}
      <div className={cn('flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-200', mainML)}>
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 h-14 flex items-center px-4 gap-3">
          <ButtonTemplate variant="ghost" size="sm" isIcon
            leftIcon={<Menu className="w-5 h-5" />}
            onClick={() => setMobileOpen(true)}
            className="md:hidden text-gray-500" />
          <ButtonTemplate variant="ghost" size="sm" isIcon
            leftIcon={collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            onClick={() => setCollapsed(v => !v)}
            className="hidden md:flex text-gray-400 hover:text-gray-700" />
          <div className="flex-1">
            <span className="text-sm font-medium text-gray-600">
              {nav
                .filter((n): n is NavLink => !('section' in n) && navLinkMatches(pathname, n.href))
                .sort((a, b) => b.href.length - a.href.length)[0]?.label ?? 'Dashboard'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: meta.navBg }}>
              <span className="text-white text-xs font-bold">{authUser.initials}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-700 leading-none">{authUser.name}</span>
              <span className="text-xs text-gray-400">{authUser.org}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
