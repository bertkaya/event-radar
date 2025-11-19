// app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { getLocalEvents } from '@/lib/storage' // Bizim motor
import { MapPin, Calendar, Loader2 } from 'lucide-react'

const MapWithNoSSR = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100"></div>
})

export default function Home() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [activeCategory, setActiveCategory] = useState<string>('Tümü')

  // SAYFA AÇILINCA BROWSER HAFIZASINDAN ÇEK
  useEffect(() => {
    const data = getLocalEvents()
    setEvents(data)
    setLoading(false)
  }, [])

  const categories = ['Tümü', ...Array.from(new Set(events.map(e => e.category)))]
  
  const filteredEvents = activeCategory === 'Tümü' 
    ? events 
    : events.filter(e => e.category === activeCategory)

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-orange-600"/></div>

  return (
    <div className="flex flex-col h-screen md:flex-row bg-white">
      
      {/* HARİTA */}
      <div className="h-[50vh] md:h-full md:w-2/3 order-1 md:order-2 relative">
        <MapWithNoSSR events={filteredEvents} selectedEvent={selectedEvent} />
        
        {/* Kategori Butonları */}
        <div className="absolute top-4 left-4 right-4 z-[999] flex gap-2 overflow-x-auto pb-2 no-scrollbar">
           {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-bold shadow-lg whitespace-nowrap backdrop-blur-sm transition ${
                  activeCategory === cat ? 'bg-black text-white' : 'bg-white/90 text-black'
                }`}>
                {cat}
              </button>
           ))}
        </div>
      </div>

      {/* LİSTE */}
      <div className="h-[50vh] md:h-full md:w-1/3 bg-white flex flex-col order-2 md:order-1 border-r z-10 shadow-2xl">
        <div className="p-5 border-b bg-gray-50">
          <h1 className="text-2xl font-black tracking-tight mb-1">EVENT RADAR</h1>
          <p className="text-xs text-gray-500 font-medium">YAKININDAKİ {filteredEvents.length} ETKİNLİK</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredEvents.map((event) => (
            <div key={event.id} onClick={() => setSelectedEvent(event)}
              className={`border rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${
                selectedEvent?.id === event.id ? 'border-black bg-black text-white' : 'border-gray-200 bg-white text-black'
              }`}>
              <div className="flex justify-between mb-2">
                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                  selectedEvent?.id === event.id ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'
                }`}>{event.category}</span>
                <span className="text-sm font-bold">{event.price}</span>
              </div>
              <h3 className="font-bold text-lg leading-tight mb-2">{event.title}</h3>
              <div className={`flex items-center text-xs gap-3 ${
                 selectedEvent?.id === event.id ? 'text-gray-400' : 'text-gray-500'
              }`}>
                <span className="flex items-center gap-1"><MapPin size={12}/> {event.venue_name}</span>
                <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(event.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}