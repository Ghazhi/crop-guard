import type { LoginCredentials, AuthResult } from './interface'

export async function login(credentials: LoginCredentials): Promise<AuthResult> {
  const res = await fetch('/api/auth/login', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(credentials),
  })
  const data = await res.json()
  if (!res.ok) return { ok: false, error: data.error ?? 'Login failed.' }
  return { ok: true, role: data.role }
}
