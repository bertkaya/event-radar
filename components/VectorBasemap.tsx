// components/VectorBasemap.tsx
'use client'

import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import type { Layer } from 'leaflet'
import 'maplibre-gl/dist/maplibre-gl.css'
import { styleReachable } from '@/lib/map_style'

/**
 * Leaflet haritasına MapLibre GL ile çizilen vektör altlık ekler (OpenFreeMap).
 * İşaretçiler, açılır pencereler ve flyTo Leaflet'te kalır; yalnızca zemin katmanı değişir.
 * Stil açılmazsa ya da MapLibre yüklenemezse onFail çağrılır ve üst bileşen raster altlığa döner.
 */
export default function VectorBasemap({ style, attribution, onFail }: { style: string; attribution: string; onFail: () => void }) {
  const map = useMap()

  useEffect(() => {
    let layer: Layer | null = null
    let cancelled = false
    ;(async () => {
      try {
        if (!(await styleReachable(style))) throw new Error('stil açılamadı')
        // ağır paketler: yalnızca vektör seçildiğinde yüklenir
        const [{ maplibreGL }, { setWorkerUrl }] = await Promise.all([import('@maplibre/maplibre-gl-leaflet'), import('maplibre-gl')])
        // İşçi dosyası public/ altından sunulur (scripts/copy-maplibre-worker.mjs); paket içi yol Turbopack'te çözülemiyor
        setWorkerUrl(`${window.location.origin}/maplibre/maplibre-gl-worker.mjs`)
        if (cancelled) return
        // Atıf metnini biz veriyoruz (OpenFreeMap koşulu); eklenti bunu Leaflet'in atıf kutusuna yazar
        layer = maplibreGL({ style, attributionControl: { customAttribution: attribution } }).addTo(map)
      } catch {
        if (!cancelled) onFail()
      }
    })()
    return () => {
      cancelled = true
      if (layer) map.removeLayer(layer)
    }
  }, [map, style, attribution, onFail])

  return null
}
