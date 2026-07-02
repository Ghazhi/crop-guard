import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { LoadingScreen } from '@/components/LoadingScreen';
import type { UserRole } from '@/types';

function roleToPath(role: UserRole): string {
  switch (role) {
    case 'farmer':     return '/farmer/home';
    case 'agent':      return '/agent/home';
    case 'staff':
    case 'admin':      return '/staff/dashboard';
    case 'partner':    return '/partner/intelligence';
    case 'agronomist': return '/agronomist/dashboard';
    case 'credits':    return '/credits/dashboard';
    default:           return '/login';
  }
}

export function AuthGate() {
  const { profile, initialized, loading } = useAuthStore();

  if (!initialized || loading) return <LoadingScreen />;
  if (!profile) return <Navigate to="/login" replace />;
  return <Navigate to={roleToPath(profile.role)} replace />;
}
