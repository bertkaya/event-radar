// components/Map.tsx
'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// İkon hatası düzeltmesi
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

export default function Map({ events }: { events: any[] }) {
  // Harita merkezi: Beyoğlu/İstanbul
  const center = [41.0258, 28.9784]

  return (
    <MapContainer center={center as L.LatLngExpression} zoom={13} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      {events.map((event) => (
        <Marker key={event.id} position={[event.lat, event.lng]} icon={icon}>
          <Popup>
            <div className="font-bold">{event.title}</div>
            <div className="text-sm">{event.venue_name}</div>
            <a href="#" className="text-xs text-blue-600 underline mt-1 block">Bilet Al</a>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}