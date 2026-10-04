// scripts/ingest/adapters/bugece.ts
// BuGece public API (https://bugece.co/api/openapi.json). robots.txt /api/list ve /api/feeds'e izin veriyor.
import type { HttpClient } from '../http'
import { emptyResult, countError, SourceError, type FetchResult, type NormalizedEvent, type SourceAdapter } from '../types'
import { localToIso, mapCategory, normalizeCity, parseCoord, isHttpsUrl, TZ } from '../../../lib/sources/normalize'

const BASE = 'https://bugece.co'
const CITIES = ['istanbul', 'ankara', 'izmir']
const PAGE_SIZE = 48
const MAX_PAGES = 15

interface ListHit {
  _id: string
  name: string
  date?: string
  start_time?: string
  end_time?: string
  slug: string
  image?: string
  venue?: { name?: string; slug?: string }
  city?: { name?: string }
  _geo?: { lat?: number; lng?: number }
  music_categories?: { name?: string }[]
}

interface Product {
  id: string
  url: string
  variants?: {
    availability?: { available?: boolean; status?: string }
    price?: { amount?: number; currency?: string }
    seller?: { name?: string }
    categories?: { value?: string }[]
  }[]
}

/** Ürün akışından fiyat/satış durumu (kuruş → TL). Akış okunamazsa boş döner; liste yine işlenir. */
async function loadProducts(http: HttpClient, log: (m: string) => void) {
  const byId = new Map<string, Product>()
  try {
    const feed = await http.json<{ products?: Product[] }>(`${BASE}/api/feeds/events/products`)
    for (const p of feed.products || []) byId.set(p.id, p)
  } catch (e) {
    log(`ürün akışı okunamadı, fiyatsız devam: ${(e as Error).message}`)
  }
  return byId
}

export function mapBugeceHit(hit: ListHit, product?: Product): NormalizedEvent | null {
  const start = localToIso(hit.start_time || hit.date)
  const city = normalizeCity(hit.city?.name)
  if (!hit._id || !hit.name || !hit.slug || !start || !city) return null

  const url = `${BASE}/event/${encodeURIComponent(hit.slug)}`
  const variant = product?.variants?.[0]
  const amount = variant?.price?.amount
  const price = typeof amount === 'number' && amount > 0 ? Math.round(amount / 100) : undefined
  const st = variant?.availability?.status
  const genres = (hit.music_categories || []).map(c => c.name)

  return {
    sourceEventId: hit._id,
    url,
    ticketUrl: url,
    title: hit.name.trim(),
    category: mapCategory([hit.name, ...genres], 'Müzik'),
    subType: genres.filter(Boolean).slice(0, 3).join(', ') || undefined,
    startTime: start,
    endTime: localToIso(hit.end_time),
    timezone: TZ,
    city,
    venueName: hit.venue?.name?.trim() || undefined,
    lat: parseCoord(hit._geo?.lat, 'lat'),
    lng: parseCoord(hit._geo?.lng, 'lng'),
    // seller (satıcı) çoğu zaman mekân/işletmedir; organizatör olarak kullanılmaz
    priceMin: price,
    currency: price ? variant?.price?.currency || 'TRY' : undefined,
    eventKind: 'ticketed',
    // Yalnızca kaynağın bildirdiği durum: tükendi
    status: st === 'out_of_stock' || variant?.availability?.available === false ? 'sold_out' : undefined,
    imageUrl: isHttpsUrl(hit.image) ? hit.image : undefined,
  }
}

export const BugeceAdapter: SourceAdapter = {
  id: 'bugece',
  type: 'ticketing',
  defaultMinIntervalMs: 1000,
  defaultTimeoutMs: 20000,

  async fetchEvents(http, log): Promise<FetchResult> {
    const result = emptyResult()
    const products = await loadProducts(http, log)
    const seen = new Set<string>()

    for (const city of CITIES) {
      for (let page = 1; page <= MAX_PAGES; page++) {
        let hits: ListHit[]
        try {
          const res = await http.json<{ data?: { hits?: ListHit[] } }>(
            `${BASE}/api/list?indices=events&page=${page}&pageSize=${PAGE_SIZE}&city=${city}`
          )
          if (!res?.data || !Array.isArray(res.data.hits)) throw new SourceError('schema_change', '/api/list yanıtında data.hits yok')
          hits = res.data.hits
        } catch (e) {
          countError(result, e)
          result.complete = false
          log(`${city} sayfa ${page}: ${(e as Error).message}`)
          if (e instanceof SourceError && (e.kind === 'access_denied' || e.kind === 'schema_change')) throw e
          break
        }

        for (const hit of hits) {
          if (seen.has(hit._id)) continue
          seen.add(hit._id)
          result.fetched++
          const ev = mapBugeceHit(hit, products.get(hit._id))
          if (ev) result.events.push(ev)
          else result.invalid++
        }
        if (hits.length < PAGE_SIZE) break
      }
    }
    return result
  },
}
