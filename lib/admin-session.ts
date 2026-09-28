// lib/admin-session.ts
// SERVER-ONLY: env şifreli admin oturumu (HMAC imzalı, httpOnly cookie).
import 'server-only'
import { createHmac, createHash, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

export const ADMIN_COOKIE = 'admin_session'
export const SESSION_TTL_SECONDS = 60 * 60 * 12 // 12 saat

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET
  if (!s || s.length < 32) throw new Error('ADMIN_SESSION_SECRET en az 32 karakter olmalı')
  return s
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  // Uzunluk sızdırmamak için önce hash'le
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected || expected.length < 12) return false
  return safeEqual(input, expected)
}

export function createSessionToken(): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  const payload = String(exp)
  return `${payload}.${sign(payload)}`
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return false
  if (!safeEqual(sig, sign(payload))) return false
  const exp = Number(payload)
  return Number.isFinite(exp) && exp > Math.floor(Date.now() / 1000)
}

export async function isAdminRequest(): Promise<boolean> {
  try {
    const store = await cookies()
    return verifySessionToken(store.get(ADMIN_COOKIE)?.value)
  } catch {
    return false
  }
}

/** Mutating isteklerde Origin başka bir siteyse reddet (CSRF'e ek katman). */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true // aynı-origin GET/fetch'lerde tarayıcı göndermeyebilir
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}
