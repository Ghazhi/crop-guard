import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, UserCog, BarChart2, Menu, X, LogOut,
  ChevronRight, PanelLeftClose, PanelLeftOpen, Leaf, UsersRound,
  ShieldAlert, Zap, TrendingUp, Settings2, Users, Globe2, Coins,
  ClipboardCheck, BookOpen, Wallet, FileText, ShieldCheck, DollarSign,
  ClipboardList, Shield, Building2, Brain, Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin/home',                icon: LayoutDashboard, label: 'Overview'              },
  { to: '/staff/dashboard',           icon: Building2,      label: 'Program Manager'      },
  { to: '/credits/dashboard',         icon: Coins,          label: 'Credit Officer'       },
  { to: '/agronomist/dashboard',      icon: Leaf,           label: 'Agronomist'            },
  { to: '/team/dashboard',             icon: DollarSign,     label: 'Finance & Insurance'   },
  { to: '/partner/norvi',             icon: Shield,         label: 'Partner / MERL'        },
  { to: '/staff/farmer-management',   icon: UsersRound,     label: 'Farmer Registry'      },
  { to: '/staff/programs',            icon: Briefcase,      label: 'Programs Setup'        },
  { to: '/staff/agents',              icon: UserCog,        label: 'Agent Assignment'      },
  { to: '/staff/fri',                  icon: TrendingUp,    label: 'FRI Dashboard'         },
  { to: '/staff/insights',             icon: Award,         label: 'Farmer Scores'         },
  { to: '/staff/interventions',       icon: Zap,            label: 'Opportunities'         },
  { to: '/staff/intelligence',        icon: ShieldAlert,    label: 'Risk Intelligence'     },
  { to: '/staff/checkin-settings',    icon: Settings2,     label: 'Check-in Config'       },
  { to: '/staff/users',               icon: Users,          label: 'User Management'       },
  { to: '/staff/reports',             icon: BarChart2,      label: 'Reports'               },
  { to: '/dashboard',                 icon: Brain,          label: 'Intelligence Dashboard' },
];

export default function SuperAdminLayout() {
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
        'fixed inset-y-0 left-0 z-30 flex flex-col transition-all duration-200',
        'w-60 bg-gray-950',
        sidebarW,
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}>
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
              <p className="text-amber-300 text-xs mt-0.5">Super Admin</p>
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
              end={to === '/dashboard'}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center rounded-lg text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
                  isActive
                    ? 'bg-amber-500 text-white'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-amber-400')} />
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
            <button
              onClick={() => navigate('/admin/configuration?tab=profile')}
              className="flex items-center gap-3 mb-3 px-1 w-full text-left group rounded-lg p-1 -m-1 hover:bg-white/5 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">
                  {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate group-hover:text-amber-200 transition-colors">{profile?.full_name || 'Admin'}</p>
                <p className="text-amber-300 text-xs">Super Admin</p>
              </div>
            </button>
          )}
          <button
            title="Sign out"
            className={cn(
              'flex items-center rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-sm h-9',
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
          >
            {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
          <div className="flex-1" />
          <button
            onClick={() => navigate('/admin/configuration?tab=profile')}
            className="flex items-center gap-2 group rounded-lg px-2 py-1 hover:bg-gray-100 transition-colors"
            title="View profile"
          >
            <div className="w-7 h-7 rounded-full bg-amber-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'A'}
              </span>
            </div>
            <span className="text-sm text-gray-700 hidden sm:block group-hover:text-amber-600 transition-colors">{profile?.full_name}</span>
          </button>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
