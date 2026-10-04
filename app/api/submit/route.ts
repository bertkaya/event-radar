// Herkese açık form gönderimleri (mekân başvurusu, etkinlik önerisi).
// RLS bu tablolara anon yazmayı kapatır; burada doğrulama + honeypot + rate limit sonrası service_role ile yazılır.
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isSameOrigin } from '@/lib/admin-session'
import { clientIp, rateLimit } from '@/lib/rate-limit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

// Doğrulama geçtikten sonra oluşturulur; service key eksikse anlaşılır hata döner
function db() {
  return getSupabaseAdmin()
}

type Body = Record<string, unknown> & { type?: string; website?: string; kvkk?: boolean }

export async function POST(request: Request) {
  try {
    return await handle(request)
  } catch (e) {
    console.error('submit error:', e)
    return NextResponse.json({ error: 'Sunucu hatası, lütfen daha sonra tekrar deneyin.' }, { status: 500 })
  }
}

async function handle(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Geçersiz istek' }, { status: 403 })
  if (!rateLimit(`submit:${clientIp(request)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Çok fazla gönderim yaptınız. Lütfen daha sonra tekrar deneyin.' }, { status: 429 })
  }

  const body: Body = await request.json().catch(() => ({}))

  // Honeypot: gerçek kullanıcı bu gizli alanı doldurmaz. Bota başarı gibi görünür.
  if (body.website) return NextResponse.json({ ok: true })

  if (body.type === 'venue_application') {
    const row = {
      venue_name: str(body.venue_name, 200),
      contact_name: str(body.contact_name, 200),
      phone: str(body.phone, 40),
      email: str(body.email, 200),
      message: str(body.message, 2000),
    }
    if (!row.venue_name || !row.contact_name || !row.phone || !EMAIL_RE.test(row.email)) {
      return NextResponse.json({ error: 'Lütfen tüm zorunlu alanları doğru doldurun.' }, { status: 400 })
    }
    if (body.kvkk !== true) {
      return NextResponse.json({ error: 'KVKK aydınlatma metnini onaylamanız gerekiyor.' }, { status: 400 })
    }
    const { error } = await db().from('venue_applications').insert(row)
    if (error) return NextResponse.json({ error: 'Kaydedilemedi, lütfen tekrar deneyin.' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.type === 'event_suggestion') {
    const row = {
      title: str(body.title, 300),
      event_url: str(body.event_url, 1000),
      notes: str(body.notes, 2000),
      contact_email: str(body.contact_email, 200),
    }
    if (!row.title) return NextResponse.json({ error: 'Etkinlik adı gerekli.' }, { status: 400 })
    if (row.contact_email && !EMAIL_RE.test(row.contact_email)) {
      return NextResponse.json({ error: 'E-posta adresi geçersiz.' }, { status: 400 })
    }
    if (row.event_url && !/^https?:\/\//i.test(row.event_url)) {
      return NextResponse.json({ error: 'Link http(s):// ile başlamalı.' }, { status: 400 })
    }
    const { error } = await db().from('event_suggestions').insert(row)
    if (error) return NextResponse.json({ error: 'Kaydedilemedi, lütfen tekrar deneyin.' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.type === 'event_report') {
    const eventId = Number(body.event_id)
    const reason = str(body.reason, 30)
    if (!Number.isInteger(eventId) || eventId <= 0) return NextResponse.json({ error: 'Etkinlik bulunamadı.' }, { status: 400 })
    if (!['wrong_date', 'wrong_venue', 'cancelled', 'wrong_price', 'other'].includes(reason)) {
      return NextResponse.json({ error: 'Lütfen bir neden seçin.' }, { status: 400 })
    }
    const { error } = await db().from('event_reports').insert({ event_id: eventId, reason, note: str(body.note, 500) || null })
    if (error) return NextResponse.json({ error: 'Kaydedilemedi, lütfen tekrar deneyin.' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Bilinmeyen form' }, { status: 400 })
}
