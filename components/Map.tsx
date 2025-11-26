// components/Map.tsx
'use client'

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useState } from 'react'

// Özel Pinler
const createDynamicIcon = (text: string, isSelected: boolean) => {
  return L.divIcon({
    className: 'custom-icon',
    html: `<div class="map-marker ${isSelected ? 'selected' : ''}">${text}</div>`,
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
  manualLocation: any; // Yeni prop
}

export default function Map({ events, selectedEvent, triggerLocate, markerMode, manualLocation }: MapProps) {
  const [userPos, setUserPos] = useState<any>(null)

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

      {/* Etkinlikler */}
      {events.map((event) => {
        let text = event.title;
        if (markerMode === 'price') text = event.price;
        if (markerMode === 'category') text = event.category;

        return (
          <Marker 
            key={event.id} 
            position={[event.lat, event.lng]} 
            icon={createDynamicIcon(text, selectedEvent?.id === event.id)}
          >
            <Popup className="custom-popup">
              <div className="text-center min-w-[150px]">
                <div className="font-bold text-brand mb-1">{event.title}</div>
                <div className="text-xs text-gray-500">{event.venue_name}</div>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}