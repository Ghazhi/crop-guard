import type { UserRole } from '@/app/login/_logics/interface'

/** Single source of truth for "where does this role land after login/at '/'". All tenant roles share one dashboard shell; only Super Admin has a distinct home. */
export function getRoleHome(role: UserRole): string {
  return role === 'super_admin' ? '/superadmin' : '/dashboard'
}
