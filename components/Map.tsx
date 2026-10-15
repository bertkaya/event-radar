// components/Map.tsx
'use client'

import { toast } from '@/lib/toast'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import type { LatLng, MapLocation, SelectableEvent } from '@/lib/types'
import { useCallback, useEffect, useState, useMemo } from 'react'
import VectorBasemap from '@/components/VectorBasemap'
import { chooseBasemap, hasWebGL } from '@/lib/map_style'

// Altlık harita: varsayılan OpenFreeMap (vektör, anahtarsız, ücretsiz) + MapLibre GL.
// Geri dönüşler (WebGL yok, stil açılmıyor, özel raster) lib/map_style.ts içinde.
// NEXT_PUBLIC_MAP_TILE_URL (+ NEXT_PUBLIC_MAP_TILE_ATTRIBUTION) tanımlanırsa o raster katman kullanılır;
// NEXT_PUBLIC_MAP_STYLE_URL vektör stilini değiştirir.

// Özel Pinler
const createDynamicIcon = (text: string, isSelected: boolean, count?: number) => {
  return L.divIcon({
    className: 'custom-icon',
    html: `<div class="map-marker ${isSelected ? 'selected' : ''}">${text}${count && count > 1 ? ` <span class="marker-count">+${count - 1}</span>` : ''}</div>`,
    iconSize: [60, 30],
    iconAnchor: [30, 35]
  })
}

// Mavi Nokta İkonu
const gpsIcon = L.divIcon({
  className: 'gps-icon-wrapper',
  html: `<div class="gps-marker"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
})

// Harita Kontrolcüsü (Beyin)
interface MapControllerProps {
  selectedEvent: SelectableEvent | null;
  triggerLocate: boolean;
  manualLocation: MapLocation | null;
  onLocationFound: (latlng: LatLng) => void;
}

function MapController({ selectedEvent, triggerLocate, manualLocation, onLocationFound }: MapControllerProps) {
  const map = useMap()

  // 0. Kap boyutu değişince (mobilde gizli harita sekmesi açılınca, döndürünce, panel daralınca) Leaflet'i yeniden ölç.
  //    Gerekli: Leaflet gizli kapta 0×0 ölçer ve kendi başına fark etmez; MapLibre tuvali de Leaflet'in 'resize' olayını bekler.
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(map.getContainer())
    return () => ro.disconnect()
  }, [map])

  // 1. Etkinlik Seçilince Uç
  useEffect(() => {
    if (selectedEvent && Number.isFinite(selectedEvent.lat) && selectedEvent.lat) {
      if (map.getSize().x > 0) map.flyTo([selectedEvent.lat, selectedEvent.lng], 15, { animate: true, duration: 1.2 })
      else map.setView([selectedEvent.lat, selectedEvent.lng], 15, { animate: false })
    }
  }, [selectedEvent, map])

  // 2. Manuel Konum Seçilince Uç
  useEffect(() => {
    if (manualLocation) {
      // Harita gizliyken (mobilde liste görünümü) boyut 0×0 olur ve flyTo "Invalid LatLng (NaN, NaN)" ile uygulamayı çökertir
      const { x, y } = map.getSize()
      if (x > 0 && y > 0) map.flyTo([manualLocation.lat, manualLocation.lng], manualLocation.zoom, { animate: true, duration: 1.5 })
      else map.setView([manualLocation.lat, manualLocation.lng], manualLocation.zoom, { animate: false })
    }
  }, [manualLocation, map])

  // 3. GPS Tetiklenince
  useEffect(() => {
    if (triggerLocate) {
      map.locate().on("locationfound", function (e) {
        if (map.getSize().x > 0) map.flyTo(e.latlng, 14, { animate: true }); else map.setView(e.latlng, 14, { animate: false });
        onLocationFound(e.latlng) // Ana sayfaya "buldum" de
      }).on("locationerror", function (e) {
        toast("Konum alınamadı. Lütfen manuel seçim yapın veya izinleri kontrol edin.");
      });
    }
  }, [triggerLocate, map])

  return null
}

interface MapProps {
  events: SelectableEvent[];
  selectedEvent: SelectableEvent | null;
  triggerLocate: boolean;
  markerMode: 'title' | 'price' | 'category';
  manualLocation: MapLocation | null;
  onEventSelect: (event: SelectableEvent) => void;
  onVenueClick?: (venueName: string, events: SelectableEvent[]) => void;
  onLocationFound?: (latlng: LatLng) => void;
}

export default function Map({ events, selectedEvent, triggerLocate, markerMode, manualLocation, onEventSelect, onVenueClick, onLocationFound }: MapProps) {
  const [userPos, setUserPos] = useState<LatLng | null>(null)
  const [showPopup, setShowPopup] = useState<string | null>(null)
  const [vectorFailed, setVectorFailed] = useState(false)
  const webgl = useMemo(() => hasWebGL(), [])
  const basemap = chooseBasemap({
    rasterUrl: process.env.NEXT_PUBLIC_MAP_TILE_URL,
    rasterAttribution: process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION,
    styleUrl: process.env.NEXT_PUBLIC_MAP_STYLE_URL,
    webgl,
    vectorFailed,
  })
  const onVectorFail = useCallback(() => setVectorFailed(true), [])

  // Group events by venue (roughly same location)
  const groupedEvents = useMemo(() => {
    const groups: { [key: string]: SelectableEvent[] } = {}

    // Koordinatı olmayan etkinlikler listede görünür, haritaya konmaz
    events.filter(e => Number.isFinite(e.lat) && Number.isFinite(e.lng) && e.lat && e.lng).forEach(event => {
      // Create a key based on venue_name or coordinates (rounded to ~100m)
      const key = event.venue_name || `${Math.round(event.lat * 100) / 100},${Math.round(event.lng * 100) / 100}`
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(event)
    })

    // Sort each group by date (closest first)
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    })

    return groups
  }, [events])

  return (
    <MapContainer center={[39.4, 31.0]} zoom={6} maxZoom={19} style={{ height: '100%', width: '100%' }} zoomControl={false}>
      {basemap.kind === 'vector'
        ? <VectorBasemap style={basemap.style} attribution={basemap.attribution} onFail={onVectorFail} />
        : <TileLayer key={basemap.url} url={basemap.url} attribution={basemap.attribution} maxZoom={19} />}

      <MapController
        selectedEvent={selectedEvent}
        triggerLocate={triggerLocate}
        manualLocation={manualLocation}
        onLocationFound={(pos) => { setUserPos(pos); onLocationFound?.(pos) }}
      />

      {/* Kullanıcı Konumu (Mavi Nokta) */}
      {userPos && <Marker position={userPos} icon={gpsIcon}><Popup>Buradasınız</Popup></Marker>}

      {/* Grouped Events */}
      {Object.entries(groupedEvents).map(([venueKey, venueEvents]) => {
        // Use first event's location for the marker
        const firstEvent = venueEvents[0]
        const eventCount = venueEvents.length
        const isAnySelected = venueEvents.some(e => selectedEvent?.id === e.id)

        let text = firstEvent.title
        if (markerMode === 'price') text = firstEvent.price
        if (markerMode === 'category') text = firstEvent.category

        // Truncate long titles for markers
        if (text && text.length > 20) {
          text = text.substring(0, 18) + '...'
        }

        return (
          <Marker
            key={venueKey}
            position={[firstEvent.lat, firstEvent.lng]}
            icon={createDynamicIcon(text, isAnySelected, eventCount)}
            eventHandlers={{
              click: () => {
                if (eventCount > 1 && onVenueClick) {
                  // Multiple events at this venue - show venue modal
                  onVenueClick(firstEvent.venue_name, venueEvents)
                } else {
                  // Single event - select directly
                  onEventSelect(firstEvent)
                }
              },
            }}
          >
            <Popup className="custom-popup">
              <div className="min-w-[180px]">
                {eventCount > 1 ? (
                  <>
                    <div className="font-bold text-brand mb-2 text-sm">{firstEvent.venue_name || 'Bu Mekanda'}</div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {venueEvents.slice(0, 5).map((ev) => (
                        <div
                          key={ev.id}
                          className="text-xs p-1.5 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                          onClick={() => onEventSelect(ev)}
                        >
                          <div className="font-medium truncate">{ev.title}</div>
                          <div className="text-gray-500 text-[10px]">
                            {new Date(ev.start_time).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                          </div>
                        </div>
                      ))}
                      {eventCount > 5 && (
                        <div className="text-[10px] text-gray-400 text-center">+{eventCount - 5} etkinlik daha</div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <div className="font-bold text-brand mb-1">{firstEvent.title}</div>
                    <div className="text-xs text-gray-500">{firstEvent.venue_name}</div>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
