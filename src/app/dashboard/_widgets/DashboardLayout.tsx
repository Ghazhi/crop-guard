'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, Building2, UserCog, TrendingUp,
  Zap, ShieldAlert, BarChart2, SlidersHorizontal, Globe2,
  Menu, X, LogOut, ChevronRight, PanelLeftClose, PanelLeftOpen, Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'

const SIDEBAR_NAV = [
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
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed,  setCollapsed]  = useState(false)
  const pathname = usePathname()
  const router   = useRouter()

  function handleSignOut() {
    router.push('/login')
  }

  const sidebarW = collapsed ? 'md:w-16' : 'md:w-60'
  const mainML   = collapsed ? 'md:ml-16' : 'md:ml-60'

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex">
      {mobileOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-30 flex flex-col transition-all duration-200',
        'w-60', sidebarW,
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )} style={{ backgroundColor: 'var(--brand-forest)' }}>

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
              <p className="text-xs mt-0.5" style={{ color: 'var(--brand-pale)' }}>Staff</p>
            </div>
          )}
          <button className="ml-auto md:hidden text-white/60 hover:text-white" onClick={() => setMobileOpen(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
          {SIDEBAR_NAV.map(({ href, icon: Icon, label, locked }) => {
            const isActive = !locked && pathname.startsWith(href)

            if (locked) {
              return (
                <div
                  key={href}
                  title={collapsed ? `${label} (coming soon)` : undefined}
                  className={cn(
                    'flex items-center rounded-lg text-sm font-medium cursor-not-allowed opacity-40',
                    collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
                  )}
                  style={{ color: 'var(--brand-pale)' }}
                >
                  <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--brand-light)' }} />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{label}</span>
                      <Lock className="w-3 h-3 opacity-70" />
                    </>
                  )}
                </div>
              )
            }

            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center rounded-lg text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
                  isActive ? 'text-white' : 'hover:bg-white/10 hover:text-white',
                )}
                style={isActive
                  ? { backgroundColor: 'var(--brand-green)' }
                  : { color: 'var(--brand-pale)' }
                }
              >
                <Icon className="w-4 h-4 shrink-0"
                  style={{ color: isActive ? 'white' : 'var(--brand-light)' }} />
                {!collapsed && (
                  <>
                    <span className="flex-1">{label}</span>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                  </>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-white/10 p-3">
          {!collapsed && (
            <div className="flex items-center gap-3 mb-3 px-1">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'var(--brand-mid)' }}>
                <span className="text-white text-xs font-bold">A</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">Abena Owusu</p>
                <p className="text-xs capitalize" style={{ color: 'var(--brand-pale)' }}>Staff</p>
              </div>
            </div>
          )}
          <ButtonTemplate
            variant="ghost"
            size="sm"
            label={collapsed ? undefined : 'Sign out'}
            isIcon={collapsed}
            leftIcon={<LogOut className="w-3.5 h-3.5 shrink-0" />}
            fullWidth
            onClick={handleSignOut}
            title="Sign out"
            className={cn(
              'justify-start hover:bg-white/10 hover:text-white!',
              collapsed && 'justify-center',
            )}
            style={{ color: 'var(--brand-pale)' }}
          />
        </div>
      </aside>

      {/* Main */}
      <div className={cn('flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-200', mainML)}>
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 h-14 flex items-center px-4 gap-3">
          <ButtonTemplate
            variant="ghost" size="sm" isIcon
            leftIcon={<Menu className="w-5 h-5" />}
            onClick={() => setMobileOpen(true)}
            className="md:hidden text-gray-500"
          />
          <ButtonTemplate
            variant="ghost" size="sm" isIcon
            leftIcon={collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            onClick={() => setCollapsed(v => !v)}
            className="hidden md:flex text-gray-400 hover:text-gray-700"
          />
          <div className="flex-1">
            <span className="text-sm font-medium text-gray-600">
              {SIDEBAR_NAV.find(n => pathname.startsWith(n.href))?.label ?? 'Dashboard'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--brand-dark)' }}>
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <span className="text-sm text-gray-700 hidden sm:block">Abena Owusu</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          {children}
        </main>
      </div>
    </div>
  )
}
