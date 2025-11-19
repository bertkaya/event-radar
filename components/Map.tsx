'use client'

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect } from 'react'

// Dinamik Pin Oluşturucu (Moda göre içerik değişir)
const createDynamicIcon = (text: string, isSelected: boolean) => {
  return L.divIcon({
    className: 'custom-icon',
    html: `<div class="map-marker ${isSelected ? 'selected' : ''}">${text}</div>`,
    iconSize: [null as any, 30],
    iconAnchor: [30, 35] // Pinin ucu tam noktaya gelsin
  })
}

// Kontrolcü
function MapController({ selectedEvent, triggerLocate }: { selectedEvent: any, triggerLocate: boolean }) {
  const map = useMap()

  useEffect(() => {
    if (selectedEvent) {
      map.flyTo([selectedEvent.lat, selectedEvent.lng], 15, { animate: true, duration: 1.2 })
    }
  }, [selectedEvent, map])

  useEffect(() => {
    if (triggerLocate) {
      map.locate().on("locationfound", function (e) {
        map.flyTo(e.latlng, 14, { animate: true });
        L.circleMarker(e.latlng, { radius: 8, color: '#800020', fillColor: '#800020', fillOpacity: 0.8 }).addTo(map);
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
}

export default function Map({ events, selectedEvent, triggerLocate, markerMode }: MapProps) {
  return (
    <MapContainer center={[41.0082, 28.9784]} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={false}>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap &copy; CARTO'
      />
      
      <MapController selectedEvent={selectedEvent} triggerLocate={triggerLocate} />

      {events.map((event) => {
        // Mod'a göre pin metnini belirle
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