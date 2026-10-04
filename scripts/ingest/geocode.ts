// scripts/ingest/geocode.ts
// Koordinatı olmayan etkinlikler için mekân konumu.
// Sıra: venues tablosu → geocode_cache → Nominatim (OSM; saniyede ≤1 istek, önbellekli, çalışma başına sınırlı).
// Bulunamazsa koordinat boş kalır (tahmin edilmez); etkinlik listede görünür, haritada görünmez.
import type { SupabaseClient } from '@supabase/supabase-js'
import { HttpClient } from './http'
import { parseCoord } from '../../lib/sources/normalize'

export interface GeoResult { lat: number; lng: number; source: 'venues' | 'nominatim' }

const MAX_NOMINATIM_PER_RUN = 40

export class Geocoder {
  private memo = new Map<string, GeoResult | null>()
  private nominatimCalls = 0
  private http = new HttpClient({ minIntervalMs: 1100, timeoutMs: 15000, retries: 1 })

  constructor(private sb: SupabaseClient, private log: (m: string) => void) {}

  async lookup(venueName: string | undefined, address: string | undefined, city: string): Promise<GeoResult | null> {
    if (!venueName && !address) return null
    const query = [venueName, address, city, 'Türkiye'].filter(Boolean).join(', ')
    const key = query.toLocaleLowerCase('tr-TR')
    if (this.memo.has(key)) return this.memo.get(key)!

    const result = (await this.fromVenues(venueName)) ?? (await this.fromCache(key)) ?? (await this.fromNominatim(key, query, venueName, address, city))
    this.memo.set(key, result)
    return result
  }

  private async fromVenues(venueName?: string): Promise<GeoResult | null> {
    if (!venueName) return null
    const { data } = await this.sb.from('venues').select('lat, lng').ilike('name', venueName).not('lat', 'is', null).limit(1)
    const v = data?.[0]
    const lat = parseCoord(v?.lat, 'lat'), lng = parseCoord(v?.lng, 'lng')
    return lat && lng ? { lat, lng, source: 'venues' } : null
  }

  private async fromCache(key: string): Promise<GeoResult | null | undefined> {
    const { data } = await this.sb.from('geocode_cache').select('lat, lng, found').eq('query', key).maybeSingle()
    if (!data) return undefined // önbellekte yok → Nominatim'e sor
    return data.found && data.lat && data.lng ? { lat: data.lat, lng: data.lng, source: 'nominatim' } : null
  }

  private async fromNominatim(key: string, query: string, venueName: string | undefined, address: string | undefined, city: string): Promise<GeoResult | null> {
    if (this.nominatimCalls >= MAX_NOMINATIM_PER_RUN) return null
    this.nominatimCalls++
    let hit: { lat?: string; lon?: string; display_name?: string } | undefined
    try {
      const res = await this.http.json<{ lat?: string; lon?: string; display_name?: string }[]>(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=tr&accept-language=tr&q=${encodeURIComponent(query)}`
      )
      hit = res?.[0]
    } catch (e) {
      this.log(`geocode başarısız (${query}): ${(e as Error).message}`)
      return null // geçici hata: önbelleğe "bulunamadı" yazma, sonraki çalışmada tekrar dener
    }

    const lat = parseCoord(hit?.lat, 'lat'), lng = parseCoord(hit?.lon, 'lng')
    // Sonuç gerçekten o şehirde mi? Değilse kabul etme
    const inCity = !!hit?.display_name && hit.display_name.toLocaleLowerCase('tr-TR').includes(city.toLocaleLowerCase('tr-TR'))
    const found = !!(lat && lng && inCity)
    await this.sb.from('geocode_cache').upsert({ query: key, lat: found ? lat : null, lng: found ? lng : null, display_name: hit?.display_name ?? null, found })

    if (!found) return null
    if (venueName) {
      // Mekânı venues'a ekle (varsa dokunma) — sonraki etkinlikler buradan bulur
      await this.sb.from('venues').upsert({ name: venueName, address: address ?? null, lat, lng, city }, { onConflict: 'name', ignoreDuplicates: true })
    }
    return { lat: lat!, lng: lng!, source: 'nominatim' }
  }
}
