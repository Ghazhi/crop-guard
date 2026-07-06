import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get('cropguard_session')
  if (!cookie?.value) {
    return NextResponse.json(null, { status: 401 })
  }
  try {
    const session = JSON.parse(atob(cookie.value))
    return NextResponse.json(session)
  } catch {
    return NextResponse.json(null, { status: 401 })
  }
}
