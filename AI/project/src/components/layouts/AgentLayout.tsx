import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, Users, ClipboardCheck, FileText, Leaf, Bell, WifiOff, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { useOfflineStore } from '@/store/offline';
import { InstallPrompt } from '@/components/InstallPrompt';

const NAV_ITEMS = [
  { to: '/agent/home',     icon: Home,           label: 'Home'     },
  { to: '/agent/farmers',  icon: Users,          label: 'Farmers'  },
  { to: '/agent/checkins', icon: ClipboardCheck, label: 'Verify'   },
  { to: '/agent/reports',  icon: FileText,       label: 'Reports'  },
  { to: '/agent/norvi',    icon: Leaf,           label: 'Norvi AI' },
];

export default function AgentLayout() {
  const profile  = useAuthStore(s => s.profile);
  const signOut  = useAuthStore(s => s.signOut);
  const isOnline = useOfflineStore(s => s.isOnline);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-cropguard-gray flex flex-col max-w-md mx-auto relative">
      {/* Offline banner */}
      {!isOnline && (
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-cropguard-amber">
          <div className="flex items-center justify-center gap-2 py-1.5 px-4">
            <WifiOff className="w-3.5 h-3.5 text-white" />
            <span className="text-white text-xs font-medium">
              Offline — data will sync when reconnected
            </span>
          </div>
        </div>
      )}

      {/* Top bar */}
      <header className={cn(
        'fixed left-1/2 -translate-x-1/2 w-full max-w-md z-30 bg-cropguard-dark transition-all',
        isOnline ? 'top-0' : 'top-[30px]'
      )}>
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-cropguard-light rounded-lg flex items-center justify-center">
              <Leaf className="w-4 h-4 text-cropguard-forest" />
            </div>
            <div>
              <span className="text-white font-semibold text-sm tracking-wide">CropGuard</span>
              <span className="text-cropguard-pale text-xs ml-1.5">Agent</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-1">
              <Bell className="w-5 h-5 text-cropguard-pale" />
            </button>

            {/* Avatar + dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                className="w-7 h-7 rounded-full bg-cropguard-mid flex items-center justify-center focus:outline-none"
                onClick={() => setMenuOpen(v => !v)}
              >
                <span className="text-white text-xs font-semibold">
                  {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'A'}
                </span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-9 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800 truncate">{profile?.full_name || 'Agent'}</p>
                    <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
                  </div>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    onClick={handleSignOut}
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Scrollable content */}
      <main className={cn(
        'flex-1 pb-20 overflow-y-auto transition-all',
        isOnline ? 'pt-14' : 'pt-[86px]'
      )}>
        <Outlet />
      </main>

      <InstallPrompt />

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-30 bg-white border-t border-gray-100 shadow-lg">
        <div className="flex items-center justify-around h-16 px-2">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-[56px]',
                  isActive ? 'text-cropguard-dark' : 'text-cropguard-slate'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    'p-1 rounded-lg transition-colors',
                    isActive ? 'bg-cropguard-mint' : ''
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-medium">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
