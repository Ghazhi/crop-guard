import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { LoadingScreen } from '@/components/LoadingScreen';
import LandingPage from '@/pages/LandingPage';
import type { UserRole } from '@/types';

function roleToPath(role: UserRole): string {
  switch (role) {
    case 'farmer':     return '/farmer/home';
    case 'agent':      return '/agent/home';
    case 'staff':
    case 'admin':      return '/staff/dashboard';
    case 'partner':    return '/partner/norvi';
    case 'agronomist': return '/agronomist/dashboard';
    case 'credits':    return '/credits/dashboard';
    case 'team':       return '/team/dashboard';
    case 'super_admin':return '/admin/home';
    default:           return '/login';
  }
}

const PROTECTED_PREFIXES: Record<UserRole, string[]> = {
  farmer:      ['/farmer'],
  agent:       ['/agent'],
  staff:       ['/staff', '/dashboard'],
  admin:       ['/staff', '/dashboard'],
  partner:     ['/partner', '/dashboard'],
  agronomist:  ['/agronomist', '/dashboard', '/staff'],
  credits:     ['/credits', '/dashboard'],
  team:        ['/team', '/dashboard'],
  super_admin: ['/admin', '/staff', '/dashboard', '/partner', '/agronomist', '/credits', '/team'],
};

export function AuthGate() {
  const { profile, initialized, loading } = useAuthStore();
  const location = useLocation();

  if (!initialized || loading) return <LoadingScreen />;
  if (!profile) return <LandingPage />;

  // If the user is already on a page they're allowed to view, stay there
  const allowed = PROTECTED_PREFIXES[profile.role] ?? [];
  const currentPath = location.pathname;
  if (currentPath !== '/' && allowed.some(p => currentPath.startsWith(p))) {
    return <Navigate to={currentPath + location.search} replace />;
  }

  return <Navigate to={roleToPath(profile.role)} replace />;
}
