import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, ClipboardCheck, Star, Zap, MessageSquare, Bell, Leaf, LogOut, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { InstallPrompt } from '@/components/InstallPrompt';

const NAV_ITEMS = [
  { to: '/farmer/home',    icon: Home,           label: 'Home'     },
  { to: '/farmer/checkin', icon: ClipboardCheck, label: 'Check-in' },
  { to: '/farmer/score',   icon: Star,           label: 'My Score' },
  { to: '/farmer/opps',    icon: Zap,            label: 'For Me'   },
  { to: '/farmer/help',    icon: MessageSquare,  label: 'Advisory' },
];

export default function FarmerLayout() {
  const profile = useAuthStore(s => s.profile);
  const signOut = useAuthStore(s => s.signOut);
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
      <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md z-30 bg-cropguard-dark">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-cropguard-light rounded-lg flex items-center justify-center">
              <Leaf className="w-4 h-4 text-cropguard-forest" />
            </div>
            <span className="text-white font-semibold text-sm tracking-wide">CropGuard</span>
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
                  {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'F'}
                </span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-9 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800 truncate">{profile?.full_name || 'Farmer'}</p>
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

      <main className="flex-1 pt-14 pb-20 overflow-y-auto">
        <Outlet />
      </main>

      <InstallPrompt />

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-30 bg-white border-t border-gray-100 shadow-lg">
        <div className="flex items-center justify-around h-16 px-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors min-w-[52px]',
                  isActive ? 'text-cropguard-dark' : 'text-cropguard-slate'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn('p-1.5 rounded-xl transition-colors', isActive ? 'bg-cropguard-mint' : '')}>
                    <Icon className="w-[18px] h-[18px]" />
                  </div>
                  <span className="text-[9px] font-semibold leading-none">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
