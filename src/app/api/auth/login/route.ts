import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/app/login/_logics/services'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  const result = authenticate(username, password)
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 401 })
  }

  const payload = btoa(JSON.stringify({ role: result.role, user: result.user }))

  const res = NextResponse.json({ ok: true, role: result.role })
  res.cookies.set('cropguard_session', payload, {
    httpOnly: true,
    sameSite: 'lax',
    path:     '/',
    maxAge:   60 * 60 * 8, // 8 hours
  })
  return res
}
