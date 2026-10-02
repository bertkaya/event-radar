import { NextResponse } from 'next/server'
import { ADMIN_COOKIE, SESSION_TTL_SECONDS, checkPassword, createSessionToken, isSameOrigin } from '@/lib/admin-session'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Geçersiz istek' }, { status: 403 })
  if (!rateLimit(`admin-login:${clientIp(request)}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Çok fazla deneme. 15 dakika sonra tekrar deneyin.' }, { status: 429 })
  }

  const { password } = await request.json().catch(() => ({ password: '' }))
  if (typeof password !== 'string' || !checkPassword(password)) {
    return NextResponse.json({ error: 'Hatalı şifre' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
  return res
}
