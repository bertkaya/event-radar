// app/page.tsx
'use client'  // <--- İŞTE SİHİRLİ KOD BU (En üste ekledik)

import dynamic from 'next/dynamic'
import { fakeEvents } from '@/lib/data' 

// Harita bileşeni (Tarayıcıda çalışması için dynamic import)
const MapWithNoSSR = dynamic(() => import('../components/Map'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full bg-gray-100 text-gray-500">Harita Yükleniyor...</div>
})

export default function Home() {
  const events = fakeEvents; 

  return (
    <div className="flex flex-col h-screen md:flex-row">
      {/* SOL TARAF: HARİTA */}
      <div className="h-[50vh] md:h-full md:w-2/3 order-1 md:order-2 relative z-0">
        <MapWithNoSSR events={events} />
      </div>

      {/* SAĞ TARAF: LİSTE */}
      <div className="h-[50vh] md:h-full md:w-1/3 bg-white p-4 overflow-y-auto order-2 md:order-1 shadow-2xl z-10">
        <h1 className="text-2xl font-bold mb-4 text-orange-600 border-b pb-2">Yakındaki Etkinlikler</h1>
        
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="border border-gray-200 rounded-lg p-4 hover:bg-orange-50 transition cursor-pointer shadow-sm group">
              <div className="flex justify-between items-start">
                <h2 className="font-semibold text-lg text-gray-800 group-hover:text-orange-600">{event.title}</h2>
                <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded font-bold">{event.price}</span>
              </div>
              <p className="text-gray-600 text-sm mt-2 flex items-center gap-1">
                📍 <span className="font-medium">{event.venue_name}</span>
              </p>
              <p className="text-gray-500 text-xs mt-1">
                📅 {new Date(event.start_time).toLocaleDateString('tr-TR')} • {new Date(event.start_time).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}