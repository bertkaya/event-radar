// scripts/ingest/adapters/biletinial.ts
// Biletinial. Kullanıcı (site sahibi) Biletinial'dan YAZILI İZİN aldığını bildirdi (2026-10-07); izin metni repoda tutulmalı.
// Liste: /tr-tr/{kategori}/{sehir} sayfalarındaki schema.org ItemList (kategori+şehir başına en çok 50 kayıt).
// Detay: etkinlik sayfasındaki schema.org Event JSON-LD (birden çok tarih/şehir dizi olarak gelir).
// Nazik: istekler arası 2 sn, robots.txt'in yasakladığı yollara (WebLogin, kino) gidilmez.
import * as cheerio from 'cheerio'
import { emptyResult, countError, SourceError, type FetchResult, type NormalizedEvent, type SourceAdapter, type EventStatus } from '../types'
import { localToIso, mapCategory, normalizeCity, stripHtml, decodeEntities, isHttpsUrl, parseCoord, TZ } from '../../../lib/sources/normalize'

const BASE = 'https://biletinial.com'
const CITIES = ['istanbul', 'ankara', 'izmir']
const LISTS: { path: string; category?: string }[] = [
  { path: 'muzik', category: 'Müzik' },
  { path: 'tiyatro', category: 'Tiyatro' },
  { path: 'egitim', category: 'Eğitim' },
]
const MAX_DETAILS_PER_LIST = 35

interface LdEvent {
  '@type'?: string
  name?: string
  description?: string
  image?: string | string[]
  url?: string
  startDate?: string
  endDate?: string
  eventStatus?: string
  location?: { name?: string; address?: { streetAddress?: string; addressLocality?: string; addressRegion?: string }; geo?: { latitude?: string | number; longitude?: string | number } }
  offers?: Offer | Offer[]
  organizer?: { name?: string }
}
interface Offer { url?: string; price?: number | string; priceCurrency?: string; availability?: string }

export function parseListUrls(html: string): string[] {
  const $ = cheerio.load(html)
  const urls: string[] = []
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const j = JSON.parse($(el).contents().text())
      for (const it of (Array.isArray(j) ? j : [j]).flatMap((x: { itemListElement?: { url?: string }[] }) => x.itemListElement ?? [])) {
        if (isHttpsUrl(it.url) && it.url.startsWith(BASE)) urls.push(it.url)
      }
    } catch { /* bozuk blok atlanır */ }
  })
  return [...new Set(urls)]
}

export function parseDetailEvents(html: string): LdEvent[] {
  const $ = cheerio.load(html)
  const out: LdEvent[] = []
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const j = JSON.parse($(el).contents().text())
      for (const x of Array.isArray(j) ? j : [j]) if (x && x['@type'] === 'Event') out.push(x)
    } catch { /* bozuk blok atlanır */ }
  })
  return out
}

const num = (v: unknown) => { const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : typeof v === 'number' ? v : NaN; return Number.isFinite(n) ? n : undefined }

/** Bir etkinlik sayfasındaki JSON-LD kayıtlarını normalize eder. Yalnızca İstanbul/Ankara/İzmir ve gelecekteki seanslar alınır. */
export function mapBiletinialEvents(events: LdEvent[], listCategory: string | undefined, now = Date.now()): NormalizedEvent[] {
  const out: NormalizedEvent[] = []
  for (const e of events) {
    const title = decodeEntities(e.name || '').trim()
    const start = localToIso(e.startDate)
    if (!title || !start || Date.parse(start) < now - 3 * 3600_000) continue
    const addr = e.location?.address
    const city = normalizeCity(addr?.addressLocality) || normalizeCity(addr?.addressRegion)
    if (!city || !['İstanbul', 'Ankara', 'İzmir'].includes(city)) continue
    const lat = parseCoord(e.location?.geo?.latitude, 'lat')
    const lng = parseCoord(e.location?.geo?.longitude, 'lng')
    const offer = Array.isArray(e.offers) ? e.offers[0] : e.offers
    const price = num(offer?.price)
    const url = isHttpsUrl(e.url) ? e.url : undefined
    if (!url) continue
    const sold = /SoldOut/i.test(offer?.availability || '')
    let status: EventStatus | undefined = sold ? 'sold_out' : undefined
    if (/Cancel/i.test(e.eventStatus || '')) status = 'cancelled'
    else if (/Postpon|Reschedul/i.test(e.eventStatus || '')) status = 'postponed'
    const image = Array.isArray(e.image) ? e.image[0] : e.image
    out.push({
      sourceEventId: `${url.replace(BASE, '')}|${start}|${e.location?.name || ''}`.slice(0, 200),
      url,
      ticketUrl: isHttpsUrl(offer?.url) ? offer.url : url,
      title,
      description: stripHtml(e.description),
      category: mapCategory([listCategory, title], listCategory || 'Müzik'),
      startTime: start,
      endTime: localToIso(e.endDate) && localToIso(e.endDate) !== start ? localToIso(e.endDate) : undefined,
      timezone: TZ,
      city,
      venueName: e.location?.name ? decodeEntities(e.location.name) : undefined,
      address: addr?.streetAddress,
      // Kaynakta bilinmeyen konum 0,0 olarak gelebilir; geçersiz koordinat atlanır
      lat: lat && lng && Math.abs(lat) > 1 && Math.abs(lng) > 1 ? lat : undefined,
      lng: lat && lng && Math.abs(lat) > 1 && Math.abs(lng) > 1 ? lng : undefined,
      organizerName: e.organizer?.name,
      // veritabanında price_min INTEGER: kesirli fiyat ("1872.5") kaydı reddettirir, tam liraya yuvarlanır
      priceMin: price && price > 0 ? Math.max(1, Math.round(price)) : undefined,
      currency: offer?.priceCurrency || (price ? 'TRY' : undefined),
      eventKind: price === 0 ? 'free' : 'ticketed',
      status,
      imageUrl: isHttpsUrl(image) ? image : undefined,
    })
  }
  return out
}

export const BiletinialAdapter: SourceAdapter = {
  id: 'biletinial',
  type: 'ticketing',
  defaultMinIntervalMs: 2000,
  defaultTimeoutMs: 25000,

  async fetchEvents(http, log): Promise<FetchResult> {
    const result = emptyResult()
    const seen = new Set<string>()
    for (const list of LISTS) {
      for (const city of CITIES) {
        let urls: string[]
        try {
          urls = parseListUrls(await http.text(`${BASE}/tr-tr/${list.path}/${city}`))
        } catch (e) {
          countError(result, e); result.complete = false
          log(`liste ${list.path}/${city}: ${(e as Error).message}`)
          continue
        }
        if (!urls.length) { countError(result, new SourceError('schema_change', 'liste boş')); result.complete = false }
        for (const url of urls.slice(0, MAX_DETAILS_PER_LIST)) {
          if (seen.has(url)) continue
          seen.add(url)
          result.fetched++
          try {
            const evs = mapBiletinialEvents(parseDetailEvents(await http.text(url)), list.category)
            if (evs.length) result.events.push(...evs)
            else result.invalid++
          } catch (e) {
            countError(result, e); result.complete = false
            log(`${url}: ${(e as Error).message}`)
          }
        }
        if (urls.length > MAX_DETAILS_PER_LIST) result.complete = false // listenin hepsi okunmadı: kaybolanlar pasifleştirilmez
      }
    }
    return result
  },
}
