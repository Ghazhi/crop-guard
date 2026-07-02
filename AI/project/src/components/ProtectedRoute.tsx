import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { LoadingScreen } from '@/components/LoadingScreen';
import type { UserRole } from '@/types';

function roleToPath(role: UserRole): string {
  switch (role) {
    case 'farmer':                  return '/farmer/home';
    case 'agent':                   return '/agent/home';
    case 'staff':
    case 'admin':
    case 'agronomist':
    case 'credits':                 return '/staff/dashboard';
    default:                        return '/login';
  }
}

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children?: React.ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { profile, initialized, loading } = useAuthStore();

  if (!initialized || loading) return <LoadingScreen />;
  if (!profile) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(profile.role)) {
    return <Navigate to={roleToPath(profile.role)} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
