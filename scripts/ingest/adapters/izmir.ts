// scripts/ingest/adapters/izmir.ts
// İzmir Büyükşehir Belediyesi açık veri API'si: Kültürsanat etkinlikleri.
// Liste: /api/ibb/kultursanat/etkinlikler   Detay (mekân + seanslar): /api/ibb/kultursanat/etkinlikler/{Id}
import { emptyResult, countError, SourceError, type FetchResult, type NormalizedEvent, type SourceAdapter, type EventKind } from '../types'
import { localToIso, mapCategory, parseCoord, stripHtml, decodeEntities, isHttpsUrl, TZ } from '../../../lib/sources/normalize'

const API = 'https://openapi.izmir.bel.tr/api/ibb/kultursanat/etkinlikler'
const SITE = 'https://kultursanat.izmir.bel.tr'
const ORGANIZER = 'İzmir Büyükşehir Belediyesi'

interface ListItem { Id: number; Adi: string; Tur?: string }

interface Session {
  SeansBaslangicTarihi?: string
  SeansBitisTarihi?: string
  UcretsizMi?: boolean
  BiletSatisLinki?: string | null
  SatisaSunusTarihi?: string
}

interface Detail {
  Adi: string
  Tur?: string
  Aciklama?: string
  AciklamaOzeti?: string
  Resim?: string
  EtkinlikUrl?: string
  EtkinlikMerkezi?: { Adi?: string; Adres?: string; KoordinatX?: string; KoordinatY?: string }
  SeansListesi?: Session[]
}

export function mapIzmirDetail(id: number, d: Detail, now = Date.now()): NormalizedEvent[] {
  const venue = d.EtkinlikMerkezi || {}
  const lat = parseCoord(venue.KoordinatX, 'lat')
  const lng = parseCoord(venue.KoordinatY, 'lng')
  const title = decodeEntities(d.Adi || '').trim()
  if (!title) return []

  const image = d.Resim?.replace(/^http:/, 'https:')
  const description = stripHtml(d.AciklamaOzeti) || stripHtml(d.Aciklama)

  return (d.SeansListesi || [])
    .map((s, i): NormalizedEvent | null => {
      const start = localToIso(s.SeansBaslangicTarihi)
      if (!start) return null
      const ticket = isHttpsUrl(s.BiletSatisLinki) ? s.BiletSatisLinki : undefined
      const kind: EventKind = s.UcretsizMi ? 'free' : ticket ? 'ticketed' : 'official'
      const saleStart = localToIso(s.SatisaSunusTarihi)
      return {
        // Seans bazında kimlik: aynı etkinliğin farklı günleri ayrı kayıt
        sourceEventId: `${id}:${s.SeansBaslangicTarihi || i}`,
        // Açık veri API'si kanonik sayfa adresi vermiyor; resmi site ana sayfasına yönlendirilir
        url: SITE,
        ticketUrl: ticket,
        title,
        description,
        category: mapCategory([d.Tur, title], 'Sanat'),
        subType: d.Tur || undefined,
        startTime: start,
        endTime: localToIso(s.SeansBitisTarihi),
        timezone: TZ,
        city: 'İzmir',
        venueName: venue.Adi ? decodeEntities(venue.Adi).trim() : undefined,
        address: venue.Adres ? `${decodeEntities(venue.Adres).trim()}, İzmir` : undefined,
        lat,
        lng,
        organizerName: ORGANIZER,
        eventKind: kind,
        status: ticket && saleStart && new Date(saleStart).getTime() > now ? 'upcoming_sale' : undefined,
        imageUrl: isHttpsUrl(image) ? image : undefined,
      }
    })
    .filter((e): e is NormalizedEvent => e !== null)
}

export const IzmirAdapter: SourceAdapter = {
  id: 'izmir-bb',
  type: 'official',
  defaultMinIntervalMs: 1500,
  defaultTimeoutMs: 20000,

  async fetchEvents(http, log): Promise<FetchResult> {
    const result = emptyResult()
    const list = await http.json<ListItem[]>(API)
    if (!Array.isArray(list)) throw new SourceError('schema_change', 'Liste yanıtı dizi değil')

    for (const item of list) {
      result.fetched++
      try {
        const detail = await http.json<Detail>(`${API}/${item.Id}`)
        if (!detail || !Array.isArray(detail.SeansListesi)) throw new SourceError('schema_change', `${item.Id}: SeansListesi yok`)
        const events = mapIzmirDetail(item.Id, detail)
        if (events.length === 0) result.invalid++
        result.events.push(...events)
      } catch (e) {
        countError(result, e)
        result.complete = false
        log(`${item.Id}: ${(e as Error).message}`)
      }
    }
    return result
  },
}
