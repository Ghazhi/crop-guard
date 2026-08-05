import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase,
  BarChart2, Menu, X, LogOut, ChevronRight,
  Zap, PanelLeftClose, PanelLeftOpen,
  UsersRound, Users, Settings2, Leaf,
  Landmark, Brain, UserCog, GitBranch,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { usePermissionsStore } from '@/store/permissions';
import { Button } from '@/components/ui/button';
import type { UserRole } from '@/types';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  adminOnly?: boolean;
  perm?: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/staff/dashboard',           icon: LayoutDashboard, label: 'Dashboard',        perm: 'dashboard'         },
  { to: '/staff/governance',           icon: Landmark,        label: 'Governance',       perm: 'governance'        },
  { to: '/staff/registry',             icon: UsersRound,      label: 'Registry',         perm: 'farmer-management' },
  { to: '/staff/programs',            icon: Briefcase,       label: 'Programs',          perm: 'programs'          },
  { to: '/staff/workflow',            icon: GitBranch,       label: 'Enrollment',        perm: 'programs'          },
  { to: '/staff/insights',             icon: Brain,           label: 'Insights',          perm: 'intelligence'      },
  { to: '/staff/interventions',        icon: Zap,             label: 'Opportunities',     perm: 'interventions'     },
  { to: '/staff/configuration',       icon: Settings2,       label: 'Configuration'                                },
  { to: '/staff/users',               icon: Users,           label: 'User Management',  adminOnly: true, perm: 'users' },
];

export default function StaffLayout() {
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [collapsed,   setCollapsed]   = useState(false);
  const { profile, signOut } = useAuthStore();
  const { canView } = usePermissionsStore();
  const navigate = useNavigate();
  const role = profile?.role as UserRole | undefined;
  const visibleNav = NAV_ITEMS.filter(item => {
    if (item.adminOnly && role !== 'admin' && role !== 'super_admin') return false;
    if (item.perm && !canView(item.perm)) return false;
    return true;
  });

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  const sidebarW = collapsed ? 'md:w-16' : 'md:w-60';
  const mainML   = collapsed ? 'md:ml-16' : 'md:ml-60';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
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
          <div className="w-8 h-8 rounded-xl overflow-hidden bg-white shrink-0 flex items-center justify-center">
            <img src="/cropguard_logo_4.png" alt="CropGuard" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-none">CropGuard</p>
              <p className="text-cropguard-pale text-xs mt-0.5 capitalize">{profile?.role ?? 'Staff'}</p>
            </div>
          )}
          {/* Mobile close */}
          <button
            className="ml-auto md:hidden text-white/60 hover:text-white"
            onClick={() => setMobileOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
          {visibleNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center rounded-lg text-sm font-medium transition-colors group',
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
                      <span className="flex-1 text-sm">{label}</span>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                    </>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-white/10 p-3">
          {!collapsed && (
            <button
              onClick={() => navigate('/staff/configuration?tab=profile')}
              className="flex items-center gap-3 mb-3 px-1 w-full text-left group rounded-lg p-1 -m-1 hover:bg-white/5 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-cropguard-mid flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">
                  {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'S'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate group-hover:text-cropguard-light transition-colors">{profile?.full_name || 'Staff User'}</p>
                <p className="text-cropguard-pale text-xs capitalize flex items-center gap-1">
                  <UserCog className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                  {profile?.role}
                </p>
              </div>
            </button>
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

      {/* Main content */}
      <div className={cn('flex-1 flex flex-col h-screen transition-all duration-200', mainML)}>
        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 h-14 flex items-center px-4 gap-3">
          {/* Mobile hamburger */}
          <button
            className="md:hidden text-gray-500 hover:text-gray-800"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          {/* Desktop collapse toggle */}
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
          <button
            onClick={() => navigate('/staff/configuration?tab=profile')}
            className="flex items-center gap-2 group rounded-lg px-2 py-1 hover:bg-gray-100 transition-colors"
            title="View profile"
          >
            <div className="w-7 h-7 rounded-full bg-cropguard-dark flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'S'}
              </span>
            </div>
            <span className="text-sm text-gray-700 hidden sm:block group-hover:text-cropguard-forest transition-colors">{profile?.full_name}</span>
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
