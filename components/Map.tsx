// components/Map.tsx
'use client'

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useState, useMemo } from 'react'

// Özel Pinler
const createDynamicIcon = (text: string, isSelected: boolean, count?: number) => {
  return L.divIcon({
    className: 'custom-icon',
    html: `<div class="map-marker ${isSelected ? 'selected' : ''}">${text}${count && count > 1 ? ` <span class="marker-count">+${count - 1}</span>` : ''}</div>`,
    iconSize: [null as any, 30],
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
function MapController({ selectedEvent, triggerLocate, manualLocation, onLocationFound }: any) {
  const map = useMap()

  // 1. Etkinlik Seçilince Uç
  useEffect(() => {
    if (selectedEvent) {
      map.flyTo([selectedEvent.lat, selectedEvent.lng], 15, { animate: true, duration: 1.2 })
    }
  }, [selectedEvent, map])

  // 2. Manuel Konum Seçilince Uç
  useEffect(() => {
    if (manualLocation) {
      map.flyTo([manualLocation.lat, manualLocation.lng], manualLocation.zoom, { animate: true, duration: 1.5 })
    }
  }, [manualLocation, map])

  // 3. GPS Tetiklenince
  useEffect(() => {
    if (triggerLocate) {
      map.locate().on("locationfound", function (e) {
        map.flyTo(e.latlng, 14, { animate: true });
        onLocationFound(e.latlng) // Ana sayfaya "buldum" de
      }).on("locationerror", function (e) {
        alert("Konum alınamadı. Lütfen manuel seçim yapın veya izinleri kontrol edin.");
      });
    }
  }, [triggerLocate, map])

  return null
}

interface MapProps {
  events: any[];
  selectedEvent: any;
  triggerLocate: boolean;
  markerMode: 'title' | 'price' | 'category';
  manualLocation: any;
  onEventSelect: (event: any) => void;
  onVenueClick?: (venueName: string, events: any[]) => void;
}

export default function Map({ events, selectedEvent, triggerLocate, markerMode, manualLocation, onEventSelect, onVenueClick }: MapProps) {
  const [userPos, setUserPos] = useState<any>(null)
  const [showPopup, setShowPopup] = useState<string | null>(null)

  // Group events by venue (roughly same location)
  const groupedEvents = useMemo(() => {
    const groups: { [key: string]: any[] } = {}

    events.forEach(event => {
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
    <MapContainer center={[39.9208, 32.8541]} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={false}>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap &copy; CARTO'
      />

      <MapController
        selectedEvent={selectedEvent}
        triggerLocate={triggerLocate}
        manualLocation={manualLocation}
        onLocationFound={(pos: any) => setUserPos(pos)}
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
                      {venueEvents.slice(0, 5).map((ev: any) => (
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
