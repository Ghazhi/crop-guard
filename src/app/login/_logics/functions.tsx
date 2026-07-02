import { fetchAuth } from './services'
import type { LoginCredentials, AuthResult } from './interface'

export async function login(credentials: LoginCredentials): Promise<AuthResult> {
  return fetchAuth(credentials)
}
