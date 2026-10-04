// scripts/ingest/adapters/kulturIstanbul.ts
// KÜLTÜR.İSTANBUL (İBB Kültür AŞ). Liste: WordPress public REST (wp/v2/event_listing).
// Tarih, tür ve mekân etkinlik sayfasındaki WP Event Manager alanlarından okunur.
import * as cheerio from 'cheerio'
import { emptyResult, countError, SourceError, type FetchResult, type NormalizedEvent, type SourceAdapter } from '../types'
import { localToIso, mapCategory, parseDmy, stripHtml, decodeEntities, isHttpsUrl, TZ } from '../../../lib/sources/normalize'

const BASE = 'https://kultur.istanbul'
const ORGANIZER = 'İBB Kültür AŞ'
const MAX_PAGES = 10

interface RestItem { id: number; link: string; title?: { rendered?: string } }

export function parseKulturPage(id: number, url: string, html: string): NormalizedEvent | null {
  const $ = cheerio.load(html)
  const title = decodeEntities($('.wpem-event-title .wpem-heading-text').first().text() || $('meta[property="og:title"]').attr('content') || '')
    .replace(/\s*-\s*KÜLTÜR\.İSTANBUL\s*$/i, '')
    .trim()

  // Yalnızca bu etkinliğin yan paneli: sayfadaki 'benzer etkinlikler' kartları da aynı sınıfları kullanıyor
  const info = $('.wpem-single-event-sidebar-info').first()
  const dateTexts = info.find('.wpem-event-date-time .wpem-event-date-time-text').map((_, el) => $(el).text().trim()).get()
  const start = parseDmy(dateTexts[0])
  // Başlangıç saati yoksa etkinliği almayız (tahmin etmeyiz)
  if (!title || !start?.time) return null
  const end = parseDmy(dateTexts[1])

  const types = info.find('.wpem-event-type .wpem-event-type-text').map((_, el) => $(el).text().trim()).get()
  const venue = info.find('.wpem-event-category .wpem-event-category-text').first().text().trim() || undefined
  const isFree = types.some(t => /ücretsiz/i.test(t))
  const image = $('meta[property="og:image"]').attr('content')

  return {
    sourceEventId: String(id),
    url,
    title,
    description: stripHtml($('meta[property="og:description"]').attr('content')),
    category: mapCategory([...types, title], 'Sanat'),
    subType: types.filter(t => !/ücretsiz/i.test(t)).join(', ') || undefined,
    startTime: localToIso(`${start.date}T${start.time}`)!,
    // Bitiş yalnızca tarih olarak verilmişse o günün sonu: tarih kaynakta yazılı, saat değil
    endTime: end ? localToIso(`${end.date}T${end.time || '23:59'}`) : undefined,
    timezone: TZ,
    city: 'İstanbul',
    venueName: venue,
    organizerName: ORGANIZER,
    eventKind: isFree ? 'free' : 'official',
    imageUrl: isHttpsUrl(image) ? image : undefined,
  }
}

export const KulturIstanbulAdapter: SourceAdapter = {
  id: 'kultur-istanbul',
  type: 'official',
  defaultMinIntervalMs: 2000,
  defaultTimeoutMs: 25000,

  async fetchEvents(http, log): Promise<FetchResult> {
    const result = emptyResult()
    const items: RestItem[] = []
    for (let page = 1; page <= MAX_PAGES; page++) {
      let batch: RestItem[]
      try {
        batch = await http.json<RestItem[]>(`${BASE}/wp-json/wp/v2/event_listing?per_page=50&page=${page}&_fields=id,link,title`)
      } catch (e) {
        // WordPress son sayfadan sonra 400 döner
        if (page > 1 && e instanceof SourceError && e.kind === 'network' && e.status === 400) break
        throw e
      }
      if (!Array.isArray(batch)) throw new SourceError('schema_change', 'event_listing yanıtı dizi değil')
      items.push(...batch)
      if (batch.length < 50) break
    }

    for (const item of items) {
      result.fetched++
      if (!isHttpsUrl(item.link) || !item.link.startsWith(BASE)) { result.invalid++; continue }
      try {
        const html = await http.text(item.link)
        const ev = parseKulturPage(item.id, item.link, html)
        if (ev) result.events.push(ev)
        else result.invalid++
      } catch (e) {
        countError(result, e)
        result.complete = false
        log(`${item.link}: ${(e as Error).message}`)
      }
    }
    return result
  },
}
