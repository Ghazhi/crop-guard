import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Leaf, Menu, X, LogOut, ChevronRight, Brain,
  PanelLeftClose, PanelLeftOpen, Users, BarChart2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

const NAV_ITEMS = [
  { to: '/dashboard',          icon: LayoutDashboard, label: 'Portfolio Overview' },
  { to: '/dashboard/farmers',  icon: Users,           label: 'Farmer List'        },
  { to: '/dashboard/analytics',icon: BarChart2,       label: 'Analytics'          },
  { to: '/partner/norvi',      icon: Brain,           label: 'Norvi AI Insights'  },
];

export default function PartnerLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed,  setCollapsed]  = useState(false);
  const { profile, signOut } = useAuthStore();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  const sidebarW = collapsed ? 'md:w-16' : 'md:w-60';
  const mainML   = collapsed ? 'md:ml-16' : 'md:ml-60';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {mobileOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={cn(
        'fixed inset-y-0 left-0 z-30 bg-cropguard-forest flex flex-col transition-all duration-200',
        'w-60',
        sidebarW,
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}>
        {/* Logo row */}
        <div className={cn(
          'flex items-center border-b border-white/10 h-16 shrink-0',
          collapsed ? 'justify-center px-0' : 'gap-3 px-5'
        )}>
          <div className="w-8 h-8 bg-cropguard-light rounded-xl flex items-center justify-center shrink-0">
            <Leaf className="w-4 h-4 text-cropguard-forest" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-none">CropGuard</p>
              <p className="text-cropguard-pale text-xs mt-0.5">Credit Officer</p>
            </div>
          )}
          <button className="ml-auto md:hidden text-white/60 hover:text-white" onClick={() => setMobileOpen(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center rounded-lg text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
                  isActive
                    ? 'bg-cropguard-green text-white'
                    : 'text-cropguard-pale hover:bg-white/10 hover:text-white'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-cropguard-light')} />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{label}</span>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                    </>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          {!collapsed && (
            <div className="flex items-center gap-3 mb-3 px-1">
              <div className="w-8 h-8 rounded-full bg-cropguard-mid flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">
                  {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'P'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{profile?.full_name || 'Partner'}</p>
                <p className="text-cropguard-pale text-xs capitalize">{profile?.role}</p>
              </div>
            </div>
          )}
          <button
            title="Sign out"
            className={cn(
              'flex items-center rounded-lg text-cropguard-pale hover:text-white hover:bg-white/10 transition-colors text-sm h-9',
              collapsed ? 'justify-center w-full px-0' : 'gap-2 w-full px-3'
            )}
            onClick={handleSignOut}
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      <div className={cn('flex-1 flex flex-col min-h-screen transition-all duration-200', mainML)}>
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 h-14 flex items-center px-4 gap-3">
          <button className="md:hidden text-gray-500 hover:text-gray-800" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <button
            className="hidden md:flex text-gray-400 hover:text-gray-700 transition-colors"
            onClick={() => setCollapsed(v => !v)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed
              ? <PanelLeftOpen className="w-5 h-5" />
              : <PanelLeftClose className="w-5 h-5" />
            }
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-cropguard-dark flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'P'}
              </span>
            </div>
            <span className="text-sm text-gray-700 hidden sm:block">{profile?.full_name}</span>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
