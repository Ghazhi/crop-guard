import { cookies } from 'next/headers'
import type { UserRole, AuthUser } from '@/app/login/_logics/interface'

export interface Session {
  role: UserRole
  user: AuthUser
}

/** Reads and decodes the httpOnly session cookie server-side — no client round trip. */
export async function getSession(): Promise<Session | null> {
  const cookie = (await cookies()).get('cropguard_session')
  if (!cookie?.value) return null
  try {
    return JSON.parse(atob(cookie.value)) as Session
  } catch {
    return null
  }
}
