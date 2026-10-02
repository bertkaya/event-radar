// Admin paneli için Supabase REST proxy'si.
// Client'taki adminDb (lib/admin-db.ts) istekleri buraya yollar; burada admin cookie'si
// doğrulanır ve istek service_role anahtarıyla PostgREST'e iletilir. Anahtar tarayıcıya hiç inmez.
import { NextResponse } from 'next/server'
import { isAdminRequest, isSameOrigin } from '@/lib/admin-session'
import { getServiceRoleKey, getSupabaseUrl } from '@/lib/supabase-admin'

const FORWARDED_REQUEST_HEADERS = ['content-type', 'prefer', 'accept', 'range', 'range-unit', 'accept-profile', 'content-profile']
const FORWARDED_RESPONSE_HEADERS = ['content-type', 'content-range', 'preference-applied']

async function proxy(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (!(await isAdminRequest())) return NextResponse.json({ message: 'Yetkisiz' }, { status: 401 })
  if (request.method !== 'GET' && !isSameOrigin(request)) return NextResponse.json({ message: 'Geçersiz istek' }, { status: 403 })

  const { path } = await params
  // Sadece PostgREST (rest/v1) — auth/storage admin uçlarına erişim yok
  if (path[0] !== 'rest' || path[1] !== 'v1' || path.some(p => p === '..' || p.includes('/'))) {
    return NextResponse.json({ message: 'İzin verilmeyen yol' }, { status: 404 })
  }

  let key: string, base: string
  try {
    key = getServiceRoleKey()
    base = getSupabaseUrl()
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 503 })
  }
  const target = `${base}/${path.map(encodeURIComponent).join('/')}${new URL(request.url).search}`
  const headers = new Headers({ apikey: key, Authorization: `Bearer ${key}` })
  for (const h of FORWARDED_REQUEST_HEADERS) {
    const v = request.headers.get(h)
    if (v) headers.set(h, v)
  }

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
    cache: 'no-store',
  })

  const resHeaders = new Headers()
  for (const h of FORWARDED_RESPONSE_HEADERS) {
    const v = upstream.headers.get(h)
    if (v) resHeaders.set(h, v)
  }
  return new Response(upstream.status === 204 ? null : await upstream.arrayBuffer(), { status: upstream.status, headers: resHeaders })
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as PUT, proxy as DELETE, proxy as HEAD }
