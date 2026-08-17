export type UserRole = 'staff' | 'partner' | 'finance' | 'pm' | 'super_admin'

export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthUser {
  name:      string
  initials:  string
  org:       string
  partnerId?: string
}

export interface AuthResult {
  ok:    boolean
  error?: string
  role?:  UserRole
  user?:  AuthUser
}
