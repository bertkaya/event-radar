// KVKK: kullanıcının kendi hesabını ve kişisel verilerini silmesi.
// profiles / favorites / follows / notifications / event_reviews auth.users'a ON DELETE CASCADE bağlı.
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isSameOrigin } from '@/lib/admin-session'

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Geçersiz istek' }, { status: 403 })

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 })

  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin.auth.getUser(token)
    if (error || !data.user) return NextResponse.json({ error: 'Oturum geçersiz' }, { status: 401 })

    // Kullanıcının önerdiği etkinliklerde sahiplik bağını kopar (etkinlik kalır, kişi bağı gider)
    await admin.from('events').update({ owner_id: null }).eq('owner_id', data.user.id)

    const { error: delError } = await admin.auth.admin.deleteUser(data.user.id)
    if (delError) throw delError
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('account delete error:', e)
    return NextResponse.json({ error: 'Hesap silinemedi, lütfen tekrar deneyin.' }, { status: 500 })
  }
}
