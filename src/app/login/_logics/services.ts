import type { AuthResult, LoginCredentials } from './interface'

export async function fetchAuth({ username, password }: LoginCredentials): Promise<AuthResult> {
  await new Promise(r => setTimeout(r, 800))
  if (!username || !password) return { ok: false, error: 'Enter your username and password.' }
  return { ok: true }
}
