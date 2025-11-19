// app/page.tsx
'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { fakeEvents } from '@/lib/data'
import { MapPin, Calendar, Filter } from 'lucide-react' // İkonları ekledik

const MapWithNoSSR = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full bg-gray-100">Harita Yükleniyor...</div>
})

export default function Home() {
  // Sitenin "Hafızası" (State)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [activeCategory, setActiveCategory] = useState<string>('Tümü')

  // Kategorileri otomatik bul
  const categories = ['Tümü', ...Array.from(new Set(fakeEvents.map(e => e.category)))]

  // Filtreleme mantığı
  const filteredEvents = activeCategory === 'Tümü' 
    ? fakeEvents 
    : fakeEvents.filter(e => e.category === activeCategory)

  return (
    <div className="flex flex-col h-screen md:flex-row bg-gray-50">
      
      {/* SOL TARAF: HARİTA */}
      <div className="h-[45vh] md:h-full md:w-2/3 order-1 md:order-2 relative shadow-inner">
        <MapWithNoSSR events={filteredEvents} selectedEvent={selectedEvent} />
        
        {/* Mobil için üstte yüzen filtre butonu */}
        <div className="absolute top-4 left-4 right-4 z-[999] md:hidden overflow-x-auto flex gap-2 pb-2 no-scrollbar">
           {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-bold shadow-lg whitespace-nowrap ${
                  activeCategory === cat ? 'bg-orange-600 text-white' : 'bg-white text-gray-700'
                }`}
              >
                {cat}
              </button>
           ))}
        </div>
      </div>

      {/* SAĞ TARAF: LİSTE */}
      <div className="h-[55vh] md:h-full md:w-1/3 bg-white flex flex-col order-2 md:order-1 border-r z-10">
        
        {/* Masaüstü Filtreler */}
        <div className="p-4 border-b hidden md:block">
          <div className="flex items-center gap-2 mb-3 text-gray-600">
            <Filter size={18} /> <span className="font-semibold">Filtrele</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition ${
                  activeCategory === cat ? 'bg-orange-600 text-white border-orange-600' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Liste Alanı */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">
            {filteredEvents.length} Etkinlik Bulundu
          </h2>
          
          {filteredEvents.map((event) => (
            <div 
              key={event.id} 
              onClick={() => setSelectedEvent(event)} // Tıklayınca seç!
              className={`border rounded-xl p-4 cursor-pointer transition duration-200 hover:shadow-md active:scale-95 ${
                selectedEvent?.id === event.id ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">
                  {event.category}
                </span>
                <span className="text-green-700 font-bold text-sm bg-green-50 px-2 py-1 rounded">
                  {event.price}
                </span>
              </div>
              
              <h3 className="font-bold text-lg text-gray-800 leading-tight mb-1">{event.title}</h3>
              
              <div className="flex items-center text-gray-500 text-xs gap-4 mt-3">
                <div className="flex items-center gap-1">
                  <MapPin size={14} /> {event.venue_name}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar size={14} /> 
                  {new Date(event.start_time).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}