import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Wallet, ClipboardList, BarChart2,
  Menu, X, LogOut, ChevronRight,
  PanelLeftClose, PanelLeftOpen, DollarSign, ShieldCheck, Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

const NAV_ITEMS = [
  { to: '/team/dashboard',   icon: LayoutDashboard, label: 'Dashboard'       },
  { to: '/team/loans',        icon: Wallet,         label: 'Loan Portfolio'  },
  { to: '/team/insurance',    icon: ShieldCheck,    label: 'Insurance'       },
  { to: '/team/petty-cash',  icon: Wallet,         label: 'Petty Cash'      },
  { to: '/team/requests',    icon: ClipboardList,  label: 'Fund Requests'   },
  { to: '/team/reports',     icon: BarChart2,       label: 'Reports'         },
  { to: '/team/scores',     icon: Award,           label: 'Farmer Scores'   },
];

export default function TeamLayout() {
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
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-30 flex flex-col transition-all duration-200 w-60',
        'bg-slate-900',
        sidebarW,
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}>
        {/* Logo */}
        <div className={cn(
          'flex items-center border-b border-white/10 h-16 shrink-0',
          collapsed ? 'justify-center px-0' : 'gap-3 px-5'
        )}>
          <div className="w-8 h-8 rounded-xl overflow-hidden bg-white shrink-0 flex items-center justify-center">
            <img src="/cropguard_logo_4.png" alt="CropGuard" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-none">CropGuard</p>
              <p className="text-slate-400 text-xs mt-0.5">Finance</p>
            </div>
          )}
          <button
            className="ml-auto md:hidden text-white/60 hover:text-white"
            onClick={() => setMobileOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
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
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-400 hover:bg-white/10 hover:text-white'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-slate-500')} />
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

        {/* Footer */}
        <div className="border-t border-white/10 p-3">
          {!collapsed && (
            <button
              onClick={() => navigate('/team/configuration?tab=profile')}
              className="flex items-center gap-3 mb-3 px-1 w-full text-left group rounded-lg p-1 -m-1 hover:bg-white/5 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">
                  {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'T'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate group-hover:text-slate-300 transition-colors">{profile?.full_name || 'Team Member'}</p>
                <p className="text-slate-400 text-xs capitalize">{profile?.role}</p>
              </div>
            </button>
          )}
          <button
            title="Sign out"
            className={cn(
              'flex items-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-sm h-9',
              collapsed ? 'justify-center w-full px-0' : 'gap-2 w-full px-3'
            )}
            onClick={handleSignOut}
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
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
            {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
          <div className="flex-1" />
          <button
            onClick={() => navigate('/team/configuration?tab=profile')}
            className="flex items-center gap-2 group rounded-lg px-2 py-1 hover:bg-gray-100 transition-colors"
            title="View profile"
          >
            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'T'}
              </span>
            </div>
            <span className="text-sm text-gray-700 hidden sm:block group-hover:text-slate-700 transition-colors">{profile?.full_name}</span>
          </button>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
