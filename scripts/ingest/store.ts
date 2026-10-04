// scripts/ingest/store.ts
// Normalize edilmiş etkinlikleri veritabanına yazar:
//  1) (source, source_event_id) ile kaynak kaydı varsa güncelle (değişmediyse sadece "son görülme")
//  2) yoksa aynı şehir/gün adaylarıyla eşleştir → yüksek güvende birleştir, orta güvende ayrı tut + incelemeye işaretle
//  3) kaynakta artık görünmeyenleri hemen silme; 48 saat sonra pasifleştir
// Admin'in verdiği onay hiçbir zaman geri alınmaz.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SourceType } from '../../lib/sources/catalog'
import { SOURCE_LABELS } from '../../lib/sources/catalog'
import { SUPPORTED_CITIES, isHttpsUrl } from '../../lib/sources/normalize'
import { matchScore, decideMatch, contentHash } from '../../lib/sources/match'
import type { NormalizedEvent } from './types'
import type { Geocoder } from './geocode'

export interface StoreStats { inserted: number; updated: number; unchanged: number; invalid: number; needsReview: number }

const MISSING_GRACE_HOURS = 48

export function isValid(ev: NormalizedEvent): boolean {
  const start = new Date(ev.startTime).getTime()
  return ev.title.trim().length >= 3 && Number.isFinite(start) && SUPPORTED_CITIES.includes(ev.city) && isHttpsUrl(ev.url)
}

/** Otomatik onay: güncel ya da süren, yeri belli, kaynağı izinli etkinlik */
export function qualifiesForAutoApproval(ev: NormalizedEvent, now = Date.now()): boolean {
  const endsAt = new Date(ev.endTime || ev.startTime).getTime()
  return isValid(ev) && endsAt >= now && !!(ev.venueName || ev.address) && ev.status !== 'cancelled'
}

function priceText(ev: NormalizedEvent): string {
  if (ev.priceMin) return ev.priceMax && ev.priceMax !== ev.priceMin ? `${ev.priceMin} - ${ev.priceMax} TL` : `${ev.priceMin} TL`
  return ev.eventKind === 'free' ? 'Ücretsiz' : ''
}

function eventRow(sourceId: string, ev: NormalizedEvent, geoSource: string | null, nowIso: string) {
  return {
    title: ev.title,
    description: ev.description ?? null,
    category: ev.category,
    tags: ev.subType ? ev.subType.split(',').map(s => s.trim()).filter(Boolean) : [],
    start_time: ev.startTime,
    end_time: ev.endTime ?? null,
    timezone: ev.timezone,
    city: ev.city,
    district: ev.district ?? null,
    venue_name: ev.venueName ?? null,
    address: ev.address ?? null,
    lat: ev.lat ?? null,
    lng: ev.lng ?? null,
    geo_source: geoSource,
    organizer_name: ev.organizerName ?? null,
    price: priceText(ev),
    min_price: ev.priceMin ?? (ev.eventKind === 'free' ? 0 : null),
    max_price: ev.priceMax ?? null,
    currency: ev.currency ?? null,
    ticket_url: ev.ticketUrl ?? ev.url,
    registration_url: ev.registrationUrl ?? null,
    image_url: ev.imageUrl ?? null,
    event_kind: ev.eventKind,
    status: ev.status ?? 'active',
    sold_out: ev.status === 'sold_out',
    primary_source: sourceId,
    last_seen_at: nowIso,
    last_verified_at: nowIso,
    updated_at: nowIso,
  }
}

function sourceRow(sourceId: string, sourceType: SourceType, ev: NormalizedEvent, hash: string, nowIso: string) {
  return {
    source: sourceId,
    source_event_id: ev.sourceEventId,
    source_type: sourceType,
    url: ev.url,
    ticket_url: ev.ticketUrl ?? null,
    title: ev.title,
    start_time: ev.startTime,
    price_min: ev.priceMin ?? null,
    price_max: ev.priceMax ?? null,
    currency: ev.currency ?? null,
    availability: ev.status ?? null,
    content_hash: hash,
    last_seen_at: nowIso,
  }
}

/** events.ticket_sources'u (arayüzün kullandığı alan) event_sources'tan yeniden kurar */
async function rebuildTicketSources(sb: SupabaseClient, eventId: number) {
  const { data } = await sb.from('event_sources').select('source, url, ticket_url, price_min').eq('event_id', eventId)
  const list = (data || []).map(s => ({
    source: SOURCE_LABELS[s.source]?.name || s.source,
    url: s.ticket_url || s.url,
    price: s.price_min ? `${s.price_min} TL` : '',
  }))
  await sb.from('events').update({ ticket_sources: list }).eq('id', eventId)
}

export async function storeEvents(
  sb: SupabaseClient,
  sourceId: string,
  sourceType: SourceType,
  events: NormalizedEvent[],
  geocoder: Geocoder,
  log: (m: string) => void,
): Promise<StoreStats> {
  const stats: StoreStats = { inserted: 0, updated: 0, unchanged: 0, invalid: 0, needsReview: 0 }
  const nowIso = new Date().toISOString()

  for (const ev of events) {
    if (!isValid(ev)) { stats.invalid++; continue }
    try {
      let geoSource: string | null = ev.lat && ev.lng ? 'source' : null
      if (!geoSource) {
        const geo = await geocoder.lookup(ev.venueName, ev.address, ev.city)
        if (geo) { ev.lat = geo.lat; ev.lng = geo.lng; geoSource = geo.source }
      }

      const hash = contentHash({
        t: ev.title, s: ev.startTime, e: ev.endTime, v: ev.venueName, p: ev.priceMin, st: ev.status,
        k: ev.eventKind, tu: ev.ticketUrl, i: ev.imageUrl, la: ev.lat, d: ev.description?.length,
      })

      const { data: existing, error: exErr } = await sb
        .from('event_sources').select('id, event_id, content_hash')
        .eq('source', sourceId).eq('source_event_id', ev.sourceEventId).maybeSingle()
      if (exErr) throw exErr

      // ---- 1) Bu kaynaktan daha önce görülmüş
      if (existing) {
        if (existing.content_hash === hash) {
          await sb.from('event_sources').update({ last_seen_at: nowIso }).eq('id', existing.id)
          await sb.from('events').update({ last_seen_at: nowIso, last_verified_at: nowIso }).eq('id', existing.event_id)
          stats.unchanged++
          continue
        }
        await sb.from('event_sources').update({ ...sourceRow(sourceId, sourceType, ev, hash, nowIso), last_changed_at: nowIso }).eq('id', existing.id)
        const { data: target } = await sb.from('events').select('primary_source').eq('id', existing.event_id).maybeSingle()
        if (target?.primary_source === sourceId) {
          // is_approved'a dokunulmaz: admin onayı ya da reddi korunur
          await sb.from('events').update(eventRow(sourceId, ev, geoSource, nowIso)).eq('id', existing.event_id)
        } else {
          await sb.from('events').update({ last_seen_at: nowIso, last_verified_at: nowIso }).eq('id', existing.event_id)
        }
        await rebuildTicketSources(sb, existing.event_id)
        stats.updated++
        continue
      }

      // ---- 2) Yeni kaynak kaydı: başka kaynaktan gelmiş aynı etkinlik var mı?
      const startMs = new Date(ev.startTime).getTime()
      const { data: candidates } = await sb
        .from('events').select('id, title, start_time, city, venue_name')
        .eq('city', ev.city)
        .gte('start_time', new Date(startMs - 12 * 3600_000).toISOString())
        .lte('start_time', new Date(startMs + 12 * 3600_000).toISOString())
        .neq('status', 'inactive')
        .limit(100)

      let best: { id: number; score: number } | null = null
      for (const c of candidates || []) {
        const score = matchScore(
          { title: ev.title, startTime: ev.startTime, city: ev.city, venueName: ev.venueName },
          { title: c.title, startTime: c.start_time, city: c.city, venueName: c.venue_name },
        )
        if (!best || score > best.score) best = { id: c.id, score }
      }
      const decision = decideMatch(best?.score ?? 0)

      if (decision.action === 'merge' && best) {
        await sb.from('event_sources').insert({ ...sourceRow(sourceId, sourceType, ev, hash, nowIso), event_id: best.id, match_confidence: decision.score })
        await sb.from('events').update({ last_seen_at: nowIso, last_verified_at: nowIso }).eq('id', best.id)
        await rebuildTicketSources(sb, best.id)
        stats.updated++
        continue
      }

      const { data: created, error: insErr } = await sb
        .from('events')
        .insert({
          ...eventRow(sourceId, ev, geoSource, nowIso),
          source_url: `${sourceId}:${ev.sourceEventId}`, // dahili tekil anahtar; kaynak bağlantısı event_sources'ta
          first_seen_at: nowIso,
          is_approved: qualifiesForAutoApproval(ev),
        })
        .select('id').single()
      if (insErr) throw insErr

      const review = decision.action === 'review'
      await sb.from('event_sources').insert({
        ...sourceRow(sourceId, sourceType, ev, hash, nowIso),
        event_id: created.id,
        match_confidence: best ? decision.score : null,
        needs_review: review,
      })
      await rebuildTicketSources(sb, created.id)
      stats.inserted++
      if (review) stats.needsReview++
    } catch (e) {
      stats.invalid++
      log(`kayıt hatası (${ev.sourceEventId} ${ev.title}): ${(e as Error).message ?? JSON.stringify(e)}`)
    }
  }
  return stats
}

/** Kaynak listesi eksiksiz okunduysa, 48 saattir görünmeyen gelecek etkinlikleri pasifleştir (silmez). */
export async function deactivateMissing(sb: SupabaseClient, sourceId: string, log: (m: string) => void): Promise<number> {
  const cutoff = new Date(Date.now() - MISSING_GRACE_HOURS * 3600_000).toISOString()
  const { data: stale } = await sb.from('event_sources').select('event_id').eq('source', sourceId).lt('last_seen_at', cutoff)
  const ids = [...new Set((stale || []).map(s => s.event_id))]
  if (ids.length === 0) return 0

  // Başka bir kaynakta hâlâ görünen etkinliğe dokunma
  const { data: fresh } = await sb.from('event_sources').select('event_id').in('event_id', ids).gte('last_seen_at', cutoff)
  const keep = new Set((fresh || []).map(s => s.event_id))
  const target = ids.filter(id => !keep.has(id))
  if (target.length === 0) return 0

  const { data } = await sb.from('events').update({ status: 'inactive', updated_at: new Date().toISOString() })
    .in('id', target).gte('start_time', new Date().toISOString()).neq('status', 'inactive').select('id')
  if (data?.length) log(`${data.length} etkinlik kaynakta görünmediği için pasifleştirildi`)
  return data?.length || 0
}

/** Tarihi geçenleri 'past' yap (yalnızca kaynağın doğrulamadığı genel durum: zaman) */
export async function markPast(sb: SupabaseClient): Promise<void> {
  const nowIso = new Date().toISOString()
  const sixHoursAgo = new Date(Date.now() - 6 * 3600_000).toISOString()
  await sb.from('events').update({ status: 'past' }).eq('status', 'active').not('end_time', 'is', null).lt('end_time', nowIso)
  await sb.from('events').update({ status: 'past' }).eq('status', 'active').is('end_time', null).lt('start_time', sixHoursAgo)
}
