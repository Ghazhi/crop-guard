export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthResult {
  ok: boolean
  error?: string
}
