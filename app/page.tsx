// app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { MapPin, Calendar, Navigation, Filter, Star, LogOut, Heart, Share2, Ticket, Map, Ban, X, Clock, CheckCircle, ChevronDown, Globe } from 'lucide-react'
import Link from 'next/link'

const MapWithNoSSR = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-100 text-brand font-bold">Harita Yükleniyor...</div>
})

// Sabit Lokasyonlar
const PRESET_LOCATIONS = [
  { name: 'İstanbul (Tümü)', lat: 41.0082, lng: 28.9784, zoom: 11 },
  { name: '• Kadıköy / Moda', lat: 40.9819, lng: 29.0256, zoom: 14 },
  { name: '• Beşiktaş / Ortaköy', lat: 41.0422, lng: 29.0060, zoom: 14 },
  { name: '• Beyoğlu / Taksim', lat: 41.0369, lng: 28.9850, zoom: 14 },
  { name: 'Ankara', lat: 39.9334, lng: 32.8597, zoom: 12 },
  { name: 'İzmir', lat: 38.4237, lng: 27.1428, zoom: 12 },
  { name: 'Eskişehir', lat: 39.7667, lng: 30.5256, zoom: 13 },
]

export default function Home() {
  const [events, setEvents] = useState<any[]>([])
  const [userPrefs, setUserPrefs] = useState<string[]>([])
  const [favorites, setFavorites] = useState<number[]>([]) 
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [activeCategory, setActiveCategory] = useState<string>('Tümü')
  const [triggerLocate, setTriggerLocate] = useState(false)
  const [manualLocation, setManualLocation] = useState<any>(null) // Manuel Konum
  const [showLocModal, setShowLocModal] = useState(false) // Konum Modalı Açık mı?
  const [currentLocName, setCurrentLocName] = useState('İstanbul') // Görünen İsim
  const [user, setUser] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    let preferences: string[] = []
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('preferences').eq('id', user.id).single()
      if (profile?.preferences) {
        preferences = profile.preferences
        setUserPrefs(preferences)
      }
      const { data: favs } = await supabase.from('favorites').select('event_id').eq('user_id', user.id)
      if (favs) setFavorites(favs.map(f => f.event_id))
    }

    const { data: eventsData } = await supabase.from('events').select('*').order('start_time', { ascending: true })

    if (eventsData) {
      const sortedEvents = eventsData.sort((a, b) => {
        const scoreA = preferences.includes(a.category) ? 10 : 0
        const scoreB = preferences.includes(b.category) ? 10 : 0
        return scoreB - scoreA
      })
      setEvents(sortedEvents)
    }
  }

  const toggleFavorite = async (e: any, eventId: number) => {
    e?.stopPropagation()
    if (!user) return alert('Favorilere eklemek için giriş yapmalısın!')

    if (favorites.includes(eventId)) {
      setFavorites(favorites.filter(id => id !== eventId))
      await supabase.from('favorites').delete().match({ user_id: user.id, event_id: eventId })
    } else {
      setFavorites([...favorites, eventId])
      await supabase.from('favorites').insert([{ user_id: user.id, event_id: eventId }])
    }
  }

  const handleShare = async (event: any) => {
    const shareText = `${event.title} @ ${event.venue_name} - 18-23 App`
    if (navigator.share) {
      try { await navigator.share({ title: event.title, text: shareText, url: 'https://event-radar.vercel.app' }) } catch (err) {}
    } else {
      navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const openDirections = (e: any, event: any) => {
    e?.stopPropagation()
    if (event.maps_url) window.open(event.maps_url, '_blank')
    else window.open(`http://googleusercontent.com/maps.google.com/?q=${event.lat},${event.lng}`, '_blank')
  }

  const openTicket = (e: any, url: string) => {
    e?.stopPropagation()
    window.open(url, '_blank')
  }

  const categories = ['Tümü', ...Array.from(new Set(events.map(e => e.category)))]
  const filteredEvents = activeCategory === 'Tümü' ? events : events.filter(e => e.category === activeCategory)

  // GPS TETİKLEME
  const handleLocate = () => {
    setTriggerLocate(true)
    setCurrentLocName("Konumum")
    setTimeout(() => setTriggerLocate(false), 1000)
  }

  // MANUEL KONUM SEÇME
  const handleSelectLocation = (loc: any) => {
    setManualLocation(loc)
    setCurrentLocName(loc.name.replace('• ', ''))
    setShowLocModal(false)
  }

  const formatHumanDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) return 'Bugün'
    if (date.toDateString() === tomorrow.toDateString()) return 'Yarın'
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })
  }

  return (
    <div className="flex flex-col h-screen w-full bg-white text-black font-sans overflow-hidden">
      
      {/* --- KONUM SEÇİM MODALI --- */}
      {showLocModal && (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Globe size={18}/> Konum Değiştir</h3>
              <button onClick={() => setShowLocModal(false)}><X size={20} className="text-gray-500"/></button>
            </div>
            <div className="p-2 max-h-[60vh] overflow-y-auto">
              {PRESET_LOCATIONS.map((loc) => (
                <button 
                  key={loc.name}
                  onClick={() => handleSelectLocation(loc)}
                  className="w-full text-left p-3 hover:bg-brand/5 rounded-lg text-sm font-medium text-gray-700 border-b border-gray-50 last:border-0 transition-colors"
                >
                  {loc.name}
                </button>
              ))}
            </div>
            <div className="p-4 bg-gray-50 border-t">
              <button onClick={() => { handleLocate(); setShowLocModal(false); }} className="w-full bg-black text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                <Navigation size={16}/> Konumumu Bul (GPS)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ETKİNLİK DETAY MODALI --- */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}></div>
          <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-3xl shadow-2xl relative flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 z-30 bg-black/50 hover:bg-black text-white p-2 rounded-full backdrop-blur transition">
              <X size={24} />
            </button>

            {selectedEvent.image_url && (
              <div className="h-64 md:h-72 bg-gray-200 relative shrink-0">
                <img src={selectedEvent.image_url} className={`w-full h-full object-cover ${selectedEvent.sold_out ? 'grayscale' : ''}`} />
                <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-white to-transparent"></div>
              </div>
            )}

            <div className={`p-6 overflow-y-auto flex-1 ${!selectedEvent.image_url && 'pt-12'}`}>
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-3xl font-black text-gray-900 leading-tight w-3/4">{selectedEvent.title}</h2>
                {userPrefs.includes(selectedEvent.category) && !selectedEvent.sold_out && (
                   <div className="flex flex-col items-center"><Star size={24} className="fill-yellow-400 text-yellow-400"/><span className="text-[10px] font-bold text-gray-400">Önerilen</span></div>
                )}
              </div>

              <div className="flex flex-col gap-3 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                 <div className="flex items-center gap-3 text-gray-700">
                    <div className="bg-white p-2 rounded-lg shadow-sm text-brand"><Calendar size={20}/></div>
                    <div><div className="text-xs font-bold text-gray-400 uppercase">Tarih</div><div className="font-bold text-lg">{formatHumanDate(selectedEvent.start_time)}</div></div>
                 </div>
                 <div className="w-full h-[1px] bg-gray-200"></div>
                 <div className="flex items-center gap-3 text-gray-700">
                    <div className="bg-white p-2 rounded-lg shadow-sm text-brand"><Clock size={20}/></div>
                    <div><div className="text-xs font-bold text-gray-400 uppercase">Saat</div><div className="font-bold text-lg">{new Date(selectedEvent.start_time).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'})}</div></div>
                 </div>
                 <div className="w-full h-[1px] bg-gray-200"></div>
                 <div className="flex items-center gap-3 text-gray-700">
                    <div className="bg-white p-2 rounded-lg shadow-sm text-brand"><MapPin size={20}/></div>
                    <div><div className="text-xs font-bold text-gray-400 uppercase">Mekan</div><div className="font-bold text-lg">{selectedEvent.venue_name}</div></div>
                 </div>
              </div>

              <div className="mb-8">
                <h3 className="font-bold text-gray-900 mb-2">Etkinlik Hakkında</h3>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">{selectedEvent.description || 'Açıklama bulunmuyor.'}</p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-white flex items-center gap-3 shrink-0 pb-8 md:pb-4">
               <button onClick={(e) => toggleFavorite(e, selectedEvent.id)} className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition"><Heart size={24} className={favorites.includes(selectedEvent.id) ? "fill-brand text-brand" : ""} /></button>
               <button onClick={() => handleShare(selectedEvent)} className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition relative">{copied ? <CheckCircle size={24} className="text-green-600"/> : <Share2 size={24} />}</button>
               {selectedEvent.sold_out ? (
                 <div className="flex-1 bg-gray-300 text-gray-500 font-bold py-3 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"><Ban size={20}/> TÜKENDİ</div>
               ) : (
                 <button onClick={(e) => openTicket(e, selectedEvent.ticket_url)} className="flex-1 bg-brand hover:bg-brand-dark text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition transform active:scale-95"><Ticket size={20}/>{selectedEvent.price?.toLowerCase().includes('ücretsiz') || selectedEvent.price === '0' ? 'ÜCRETSİZ KATIL' : `BİLET AL (${selectedEvent.price})`}</button>
               )}
               <button onClick={(e) => openDirections(e, selectedEvent)} className="p-3 rounded-xl bg-black text-white hover:bg-gray-800 transition" title="Yol Tarifi"><Navigation size={24} /></button>
            </div>
          </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <header className="h-[70px] bg-white border-b border-gray-200 px-4 md:px-6 flex justify-between items-center z-50 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          
          {/* LOGO */}
          <div className="flex items-center gap-2">
             <div className="bg-brand text-white font-black text-xl px-3 py-1 tracking-tighter rounded-sm">18-23</div>
          </div>

          {/* ŞEHİR SEÇİCİ (YENİ) */}
          <button 
            onClick={() => setShowLocModal(true)}
            className="flex items-center gap-1 text-sm font-bold text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded-full transition"
          >
            <MapPin size={16} className="text-brand"/>
            {currentLocName}
            <ChevronDown size={14} className="text-gray-400"/>
          </button>

        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <Link href="/profile" className="text-right hidden md:block hover:opacity-70 transition cursor-pointer">
                <div className="text-xs font-bold text-gray-900">{user.email.split('@')[0]}</div>
                <div className="text-[10px] text-gray-500 flex justify-end gap-1"><span>{favorites.length} Favori</span></div>
              </Link>
              <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} className="text-gray-400 hover:text-brand transition"><LogOut size={18} /></button>
            </div>
          ) : (
            <Link href="/login" className="text-xs font-bold bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition">Giriş Yap</Link>
          )}
        </div>
      </header>

      {/* --- İÇERİK --- */}
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden relative">
        
        <div className="h-[40%] md:h-full md:w-[60%] bg-gray-100 relative order-1 md:order-2">
          <MapWithNoSSR 
            events={filteredEvents} 
            selectedEvent={selectedEvent} 
            triggerLocate={triggerLocate} 
            markerMode="title" 
            manualLocation={manualLocation} // Manuel konumu haritaya ilet
          />
          
          {/* Hızlı GPS Butonu (Harita Üstü) */}
          <button onClick={handleLocate} className="absolute top-4 right-4 z-[1000] bg-white p-3 rounded-xl shadow-lg hover:bg-brand hover:text-white transition text-gray-700 border border-gray-200">
             <Navigation size={20} />
          </button>

          <div className="md:hidden absolute top-4 left-4 right-16 z-[900] overflow-x-auto no-scrollbar">
             <div className="flex gap-2">
               {categories.map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-md whitespace-nowrap backdrop-blur-md ${activeCategory === cat ? 'bg-brand text-white' : 'bg-white/90 text-gray-800'}`}>{cat}</button>
               ))}
             </div>
          </div>
        </div>

        <div className="h-[60%] md:h-full md:w-[40%] bg-white order-2 md:order-1 border-r border-gray-200 flex flex-col shadow-2xl relative z-20">
           <div className="p-5 border-b border-gray-100 flex justify-between items-end bg-white shrink-0">
             <div><h1 className="text-2xl font-black tracking-tighter text-gray-900 mb-1">AKIŞ</h1><p className="text-xs font-bold text-gray-400 flex items-center gap-1"><Filter size={12}/> {activeCategory}</p></div>
             <div className="hidden md:flex gap-1 flex-wrap justify-end w-1/2">
                {categories.map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-2 py-1 rounded text-[10px] font-bold border transition ${activeCategory === cat ? 'bg-brand text-white border-brand' : 'bg-white text-gray-500 hover:border-brand'}`}>{cat}</button>
                ))}
             </div>
           </div>

           <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50">
             {filteredEvents.length === 0 && <div className="text-center text-gray-400 mt-10 text-sm font-medium">Etkinlik bulunamadı.</div>}

             {filteredEvents.map((event) => {
               const isRecommended = userPrefs.includes(event.category);
               const isFav = favorites.includes(event.id);
               const isSoldOut = event.sold_out;

               return (
                <div key={event.id} onClick={() => setSelectedEvent(event)}
                  className={`group bg-white rounded-3xl cursor-pointer transition-all border relative overflow-hidden flex flex-row md:flex-col items-stretch md:items-stretch h-32 md:h-auto hover:shadow-lg hover:border-brand/30 ${!event.image_url ? 'h-auto' : ''}`}>
                  
                  {event.image_url && (
                    <div className="w-32 h-full md:w-full md:h-40 bg-gray-200 shrink-0 relative">
                      <img src={event.image_url} alt={event.title} className={`w-full h-full object-cover ${isSoldOut ? 'grayscale' : ''}`} />
                      {isSoldOut && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-[10px] font-bold text-white bg-red-600 px-1 rounded">TÜKENDİ</span></div>}
                      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase md:block hidden">{event.category}</div>
                    </div>
                  )}

                  <div className="p-3 md:p-4 flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-1">
                       {!event.image_url && <span className="text-[10px] font-bold uppercase text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{event.category}</span>}
                       {event.image_url && <div className="md:hidden"></div>}
                       <span className="text-xs font-black text-brand bg-red-50 px-2 py-1 rounded whitespace-nowrap ml-auto">{event.price === '0' || event.price?.toLowerCase().includes('ücretsiz') ? 'Ücretsiz' : event.price}</span>
                    </div>

                    <div>
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-sm md:text-lg text-gray-900 leading-tight line-clamp-2">{event.title}</h3>
                            {isRecommended && !isSoldOut && <Star size={12} className="fill-yellow-400 text-yellow-400 shrink-0 ml-1"/>}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1 truncate"><MapPin size={12}/> {event.venue_name}</div>
                    </div>
                    
                    <div className="flex justify-between items-end mt-2">
                        <div className="text-xs text-gray-400 font-medium">{new Date(event.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                        <button onClick={(e) => toggleFavorite(e, event.id)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 z-10 relative">
                           <Heart size={16} className={isFav ? "fill-brand text-brand" : ""} />
                        </button>
                    </div>
                  </div>
                </div>
               )
             })}
             <div className="h-8"></div>
           </div>
        </div>
      </div>
    </div>
  )
}