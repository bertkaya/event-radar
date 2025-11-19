// components/Map.tsx
'use client'

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect } from 'react'

// İkon düzeltmesi
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

// BU YENİ: Haritayı uçuran ufak bileşen
function MapController({ selectedEvent }: { selectedEvent: any }) {
  const map = useMap()

  useEffect(() => {
    if (selectedEvent) {
      map.flyTo([selectedEvent.lat, selectedEvent.lng], 15, {
        animate: true,
        duration: 1.5 // 1.5 saniyede süzülerek git
      })
    }
  }, [selectedEvent, map])

  return null
}

export default function Map({ events, selectedEvent }: { events: any[], selectedEvent: any }) {
  return (
    <MapContainer center={[41.0082, 28.9784]} zoom={12} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      
      {/* Motoru haritaya ekledik */}
      <MapController selectedEvent={selectedEvent} />

      {events.map((event) => (
        <Marker key={event.id} position={[event.lat, event.lng]} icon={icon}>
          <Popup>
            <div className="font-bold">{event.title}</div>
            <div className="text-sm">{event.venue_name}</div>
            <div className="text-xs text-orange-600 font-bold mt-1">{event.price}</div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}