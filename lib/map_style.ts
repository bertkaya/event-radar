// Harita altlığı seçimi (saf mantık; bileşenden ayrı ki test edilebilsin).
//
// Varsayılan: OpenFreeMap (vektör, anahtarsız, ücretsiz) + MapLibre GL.
// Geri dönüşler: NEXT_PUBLIC_MAP_TILE_URL tanımlıysa o raster katman kullanılır (eski davranış);
// tarayıcıda WebGL yoksa ya da OpenFreeMap stili açılmazsa OpenStreetMap rasterına düşülür.

export const OSM_RASTER_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıcıları'

export const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'
export const OPENFREEMAP_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> &copy; ' +
  '<a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> Data from ' +
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'

export type Basemap =
  | { kind: 'raster'; url: string; attribution: string; reason: 'env' | 'no-webgl' | 'vector-failed' }
  | { kind: 'vector'; style: string; attribution: string }

export type BasemapInput = {
  rasterUrl?: string          // NEXT_PUBLIC_MAP_TILE_URL
  rasterAttribution?: string  // NEXT_PUBLIC_MAP_TILE_ATTRIBUTION
  styleUrl?: string           // NEXT_PUBLIC_MAP_STYLE_URL (vektör stili değiştirmek için)
  webgl: boolean
  vectorFailed?: boolean
}

export function chooseBasemap(i: BasemapInput): Basemap {
  const raster = i.rasterUrl?.trim()
  if (raster) return { kind: 'raster', url: raster, attribution: i.rasterAttribution?.trim() || OSM_ATTRIBUTION, reason: 'env' }
  if (!i.webgl) return { kind: 'raster', url: OSM_RASTER_URL, attribution: OSM_ATTRIBUTION, reason: 'no-webgl' }
  if (i.vectorFailed) return { kind: 'raster', url: OSM_RASTER_URL, attribution: OSM_ATTRIBUTION, reason: 'vector-failed' }
  return { kind: 'vector', style: i.styleUrl?.trim() || OPENFREEMAP_STYLE, attribution: OPENFREEMAP_ATTRIBUTION }
}

/** Tarayıcıda WebGL var mı? (Sunucuda ya da desteklenmeyen tarayıcıda false.) */
export function hasWebGL(): boolean {
  if (typeof document === 'undefined') return false
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

/** Vektör stili gerçekten açılıyor mu? Açılmazsa (ağ hatası, 4xx/5xx, zaman aşımı) raster'a düşülür. */
export async function styleReachable(url: string, fetchImpl: typeof fetch = fetch, timeoutMs = 6000): Promise<boolean> {
  try {
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), timeoutMs)
    try {
      const r = await fetchImpl(url, { signal: ctl.signal })
      return r.ok
    } finally {
      clearTimeout(t)
    }
  } catch {
    return false
  }
}
