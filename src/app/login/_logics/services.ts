import type { AuthResult, UserRole, AuthUser } from './interface'

const MOCK_USERS: { username: string; password: string; role: UserRole; user: AuthUser }[] = [
  { username: 'staff',   password: 'staff123',   role: 'staff',   user: { name: 'Abena Owusu',   initials: 'AO', org: 'CropGuard'       } },
  { username: 'partner', password: 'partner123', role: 'partner', user: { name: 'Kwame Mensah',  initials: 'KM', org: 'Fidelity Bank', partnerId: 'p-001' } },
  { username: 'finance', password: 'finance123', role: 'finance', user: { name: 'Akosua Asante', initials: 'AA', org: 'Agricultural DFI' } },
]

// Used server-side by the API route
export function authenticate(username: string, password: string): AuthResult {
  if (!username || !password) return { ok: false, error: 'Enter your username and password.' }
  const match = MOCK_USERS.find(u => u.username === username && u.password === password)
  if (!match) return { ok: false, error: 'Invalid username or password.' }
  return { ok: true, role: match.role, user: match.user }
}
