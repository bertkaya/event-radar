'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { getLocalEvents } from '@/lib/storage'
import { MapPin, Calendar, Navigation, Eye, Filter, Clock } from 'lucide-react'

const MapWithNoSSR = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-400">Harita Yükleniyor...</div>
})

export default function Home() {
  const [events, setEvents] = useState<any[]>([])
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [activeCategory, setActiveCategory] = useState<string>('Tümü')
  const [activeDay, setActiveDay] = useState<string>('Tümü') // Gün Filtresi
  const [triggerLocate, setTriggerLocate] = useState(false)
  const [markerMode, setMarkerMode] = useState<'title' | 'price' | 'category'>('title')

  useEffect(() => {
    setEvents(getLocalEvents())
  }, [])

  // Filtreleme Mantığı
  const categories = ['Tümü', ...Array.from(new Set(events.map(e => e.category)))]
  const days = ['Tümü', 'Bugün', 'Yarın', 'Hafta Sonu']

  const getDayString = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) return 'Bugün';
    if (d.toDateString() === tomorrow.toDateString()) return 'Yarın';
    if (d.getDay() === 0 || d.getDay() === 6) return 'Hafta Sonu';
    return 'Diğer';
  }

  const filteredEvents = events.filter(e => {
    const catMatch = activeCategory === 'Tümü' || e.category === activeCategory;
    const dayString = getDayString(e.start_time);
    
    // Hafta sonu özel kontrolü (Bugün cumartesi ise hem 'Bugün' hem 'Hafta Sonu' sayılır)
    let dayMatch = activeDay === 'Tümü';
    if (activeDay === 'Bugün' && dayString === 'Bugün') dayMatch = true;
    else if (activeDay === 'Yarın' && dayString === 'Yarın') dayMatch = true;
    else if (activeDay === 'Hafta Sonu' && (dayString === 'Hafta Sonu' || getDayString(e.start_time) === 'Bugün')) {
        // Basit mantık: Gün hafta sonuna denk geliyorsa
        const d = new Date(e.start_time).getDay();
        if (d === 0 || d === 6) dayMatch = true;
        else dayMatch = false;
    } else if (activeDay !== 'Tümü' && activeDay !== 'Hafta Sonu') {
        dayMatch = false;
    }

    return catMatch && dayMatch;
  });

  // Türkçe Tarih Formatlayıcı
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('tr-TR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    }).format(date);
  }

  const handleLocate = () => {
    setTriggerLocate(true)
    setTimeout(() => setTriggerLocate(false), 1000)
  }

  return (
    <div className="flex flex-col h-screen w-full bg-white text-black font-sans overflow-hidden">
      
      {/* --- HEADER --- */}
      <header className="h-[70px] bg-white border-b border-gray-200 px-6 flex justify-between items-center z-50 shrink-0 shadow-sm">
        
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="bg-brand text-white font-black text-xl px-3 py-1 tracking-tighter rounded-sm">
            18-23
          </div>
          <div className="hidden md:block text-[10px] text-gray-400 font-bold leading-tight tracking-wide">
            MESAI SONRASI<br/>ETKİNLİK REHBERİ
          </div>
        </div>

        {/* Orta Filtreler (Gün ve Kategori) */}
        <div className="hidden md:flex items-center gap-6">
            {/* Gün Filtresi */}
            <div className="flex bg-gray-100 rounded-lg p-1">
                {days.map(day => (
                    <button key={day} onClick={() => setActiveDay(day)}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                            activeDay === day ? 'bg-white text-brand shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}>
                        {day}
                    </button>
                ))}
            </div>
            
            {/* Kategori Filtresi */}
            <div className="flex gap-2">
                {categories.map(cat => (
                    <button key={cat} onClick={() => setActiveCategory(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                            activeCategory === cat ? 'bg-brand text-white border-brand' : 'bg-white text-gray-500 border-gray-200 hover:border-brand'
                        }`}>
                        {cat}
                    </button>
                ))}
            </div>
        </div>

        {/* Mobil Menü İkonu (Sadece görsel) */}
        <div className="md:hidden text-brand font-bold flex items-center gap-1">
            <Clock size={16}/> 18-23
        </div>
      </header>

      {/* --- İÇERİK --- */}
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden relative">
        
        {/* 1. HARİTA (Sol) */}
        <div className="h-[50%] md:h-full md:w-[60%] bg-gray-100 relative order-1 md:order-2">
          <MapWithNoSSR 
            events={filteredEvents} 
            selectedEvent={selectedEvent} 
            triggerLocate={triggerLocate}
            markerMode={markerMode}
          />

          {/* Harita Kontrolleri (Sağ Üst) */}
          <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2 items-end">
            
            {/* Pusula (GPS) */}
            <button onClick={handleLocate} className="bg-white p-3 rounded-xl shadow-lg border border-gray-200 hover:bg-brand hover:text-white transition-colors text-gray-700" title="Konumumu Bul">
                <Navigation size={20} />
            </button>

            {/* Pin Görünüm Menüsü */}
            <div className="bg-white/95 backdrop-blur p-2 rounded-xl shadow-lg border border-gray-200 flex flex-col gap-1 w-32">
                <div className="text-[10px] font-bold text-gray-400 uppercase px-2 mb-1 flex items-center gap-1">
                    <Eye size={10}/> Pin Gösterimi
                </div>
                <button onClick={() => setMarkerMode('title')} className={`text-left text-xs px-2 py-1.5 rounded-lg font-bold transition ${markerMode === 'title' ? 'bg-gray-100 text-brand' : 'hover:bg-gray-50'}`}>
                    Etkinlik Adı
                </button>
                <button onClick={() => setMarkerMode('price')} className={`text-left text-xs px-2 py-1.5 rounded-lg font-bold transition ${markerMode === 'price' ? 'bg-gray-100 text-brand' : 'hover:bg-gray-50'}`}>
                    Fiyat
                </button>
                <button onClick={() => setMarkerMode('category')} className={`text-left text-xs px-2 py-1.5 rounded-lg font-bold transition ${markerMode === 'category' ? 'bg-gray-100 text-brand' : 'hover:bg-gray-50'}`}>
                    Kategori
                </button>
            </div>
          </div>

          {/* Mobil Filtreler (Harita üzerinde yüzer) */}
          <div className="absolute top-4 left-4 right-16 z-[1000] md:hidden flex flex-col gap-2 pointer-events-none">
             <div className="overflow-x-auto no-scrollbar pointer-events-auto">
                <div className="flex gap-2">
                    {days.map(day => (
                        <button key={day} onClick={() => setActiveDay(day)} className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-md whitespace-nowrap ${activeDay === day ? 'bg-brand text-white' : 'bg-white text-gray-800'}`}>{day}</button>
                    ))}
                </div>
             </div>
          </div>
        </div>

        {/* 2. LİSTE (Sağ) */}
        <div className="h-[50%] md:h-full md:w-[40%] bg-white order-2 md:order-1 border-r border-gray-200 flex flex-col shadow-xl relative z-20">
           
           {/* Liste Başlık */}
           <div className="p-5 border-b border-gray-100 flex justify-between items-end bg-white">
             <div>
               <h1 className="text-2xl font-black tracking-tighter text-gray-900 mb-1">ETKİNLİKLER</h1>
               <p className="text-xs font-bold text-gray-400 flex items-center gap-1">
                 <Filter size={12}/> {activeDay} • {activeCategory}
               </p>
             </div>
             <span className="bg-brand text-white text-xs font-bold px-2 py-1 rounded-md">{filteredEvents.length} Sonuç</span>
           </div>

           {/* Kartlar */}
           <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
             {filteredEvents.length === 0 && (
                <div className="text-center text-gray-400 mt-10 text-sm font-medium">Bu kriterlere uygun etkinlik bulunamadı.</div>
             )}

             {filteredEvents.map((event) => (
               <div key={event.id} onClick={() => setSelectedEvent(event)}
                 className={`group bg-white p-5 rounded-2xl cursor-pointer transition-all border relative ${
                   selectedEvent?.id === event.id 
                     ? 'border-brand ring-1 ring-brand shadow-lg' 
                     : 'border-gray-100 hover:shadow-md hover:border-gray-300'
                 }`}>
                 
                 {/* Tarih ve Kategori */}
                 <div className="flex justify-between items-start mb-3">
                   <div className="flex flex-col">
                     <span className="text-xs font-bold text-brand uppercase tracking-wide flex items-center gap-1">
                        <Calendar size={12}/> {formatDate(event.start_time).split(' ')[0]} {formatDate(event.start_time).split(' ')[1]} {/* Gün ve Ay */}
                     </span>
                     <span className="text-[10px] font-extrabold text-gray-400 uppercase mt-0.5">
                        {formatDate(event.start_time).split(' ').slice(2).join(' ')} {/* Gün Adı */}
                     </span>
                   </div>
                   <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded uppercase">
                     {event.category}
                   </span>
                 </div>

                 {/* Başlık */}
                 <h3 className="font-bold text-xl text-gray-900 leading-tight mb-2 group-hover:text-brand transition-colors">
                   {event.title}
                 </h3>
                 
                 {/* Açıklama */}
                 <p className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed border-l-2 border-gray-100 pl-2">
                   {event.description}
                 </p>

                 {/* Footer */}
                 <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                       <MapPin size={14} className="text-gray-400" />
                       {event.venue_name}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 line-through decoration-brand/50"></span>
                        <span className="text-sm font-black text-brand bg-red-50 px-2 py-0.5 rounded">
                            {event.price}
                        </span>
                    </div>
                 </div>
               </div>
             ))}
             <div className="h-8"></div>
           </div>
        </div>

      </div>
    </div>
  )
}