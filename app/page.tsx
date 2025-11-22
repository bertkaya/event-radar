// app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { MapPin, Calendar, Navigation, Filter, Star, LogOut, Heart, Share2, ExternalLink, Ticket, Map, Ban } from 'lucide-react'
import Link from 'next/link'

const MapWithNoSSR = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-100 text-brand font-bold">Harita Yükleniyor...</div>
})

export default function Home() {
  const [events, setEvents] = useState<any[]>([])
  const [userPrefs, setUserPrefs] = useState<string[]>([])
  const [favorites, setFavorites] = useState<number[]>([]) 
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [activeCategory, setActiveCategory] = useState<string>('Tümü')
  const [triggerLocate, setTriggerLocate] = useState(false)
  const [user, setUser] = useState<any>(null)

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
    e.stopPropagation()
    if (!user) return alert('Favorilere eklemek için giriş yapmalısın!')

    if (favorites.includes(eventId)) {
      setFavorites(favorites.filter(id => id !== eventId))
      await supabase.from('favorites').delete().match({ user_id: user.id, event_id: eventId })
    } else {
      setFavorites([...favorites, eventId])
      await supabase.from('favorites').insert([{ user_id: user.id, event_id: eventId }])
    }
  }

  const openDirections = (e: any, event: any) => {
    e.stopPropagation()
    if (event.maps_url) window.open(event.maps_url, '_blank')
    else window.open(`http://maps.google.com/?q=${event.lat},${event.lng}`, '_blank')
  }

  const openTicket = (e: any, url: string) => {
    e.stopPropagation()
    window.open(url, '_blank')
  }

  const categories = ['Tümü', ...Array.from(new Set(events.map(e => e.category)))]
  const filteredEvents = activeCategory === 'Tümü' ? events : events.filter(e => e.category === activeCategory)

  const handleLocate = () => {
    setTriggerLocate(true)
    setTimeout(() => setTriggerLocate(false), 1000)
  }

  return (
    <div className="flex flex-col h-screen w-full bg-white text-black font-sans overflow-hidden">
      
      {/* HEADER */}
      <header className="h-[70px] bg-white border-b border-gray-200 px-6 flex justify-between items-center z-50 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-brand text-white font-black text-xl px-3 py-1 tracking-tighter rounded-sm">18-23</div>
          <div className="hidden md:block text-[10px] text-gray-400 font-bold leading-tight">MESAI SONRASI<br/>ETKİNLİK REHBERİ</div>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <div className="text-xs font-bold text-gray-900">{user.email.split('@')[0]}</div>
                <div className="text-[10px] text-gray-500 flex justify-end gap-1"><span>{favorites.length} Favori</span></div>
              </div>
              <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} className="text-gray-400 hover:text-brand transition"><LogOut size={18} /></button>
            </div>
          ) : (
            <Link href="/login" className="text-xs font-bold bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition">Giriş Yap</Link>
          )}
        </div>
      </header>

      {/* İÇERİK */}
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden relative">
        
        {/* HARİTA (SOL) */}
        <div className="h-[40%] md:h-full md:w-[60%] bg-gray-100 relative order-1 md:order-2">
          <MapWithNoSSR events={filteredEvents} selectedEvent={selectedEvent} triggerLocate={triggerLocate} markerMode="title" />
          <button onClick={handleLocate} className="absolute top-4 right-4 z-[1000] bg-white p-3 rounded-xl shadow-lg hover:bg-brand hover:text-white transition text-gray-700 border border-gray-200"><Navigation size={20} /></button>
          <div className="md:hidden absolute top-4 left-4 right-16 z-[900] overflow-x-auto no-scrollbar">
             <div className="flex gap-2">
               {categories.map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-md whitespace-nowrap backdrop-blur-md ${activeCategory === cat ? 'bg-brand text-white' : 'bg-white/90 text-gray-800'}`}>{cat}</button>
               ))}
             </div>
          </div>
        </div>

        {/* LİSTE (SAĞ) */}
        <div className="h-[60%] md:h-full md:w-[40%] bg-white order-2 md:order-1 border-r border-gray-200 flex flex-col shadow-2xl relative z-20">
           <div className="p-5 border-b border-gray-100 flex justify-between items-end bg-white shrink-0">
             <div>
               <h1 className="text-2xl font-black tracking-tighter text-gray-900 mb-1">AKIŞ</h1>
               <p className="text-xs font-bold text-gray-400 flex items-center gap-1"><Filter size={12}/> {activeCategory}</p>
             </div>
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
               const isFree = event.price?.toLowerCase().includes('ücretsiz') || event.price === '0';
               const isSoldOut = event.sold_out; // Sold Out kontrolü

               return (
                <div key={event.id} onClick={() => setSelectedEvent(event)}
                  className={`group bg-white rounded-3xl cursor-pointer transition-all border relative overflow-hidden ${
                    selectedEvent?.id === event.id ? 'border-brand ring-1 ring-brand shadow-xl' : 'border-gray-200 hover:border-brand/50 hover:shadow-lg'
                  }`}>
                  
                  {/* GÖRSEL ALANI (Varsa Göster) */}
                  {event.image_url && (
                    <div className="h-40 bg-gray-200 relative w-full overflow-hidden">
                      <img src={event.image_url} alt={event.title} className={`w-full h-full object-cover transition-transform duration-500 ${isSoldOut ? 'grayscale' : 'group-hover:scale-105'}`} />
                      
                      {/* Sold Out Etiketi */}
                      {isSoldOut && (
                         <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                            <span className="bg-red-600 text-white font-black text-lg px-4 py-2 transform -rotate-12 border-2 border-white uppercase tracking-widest">SOLD OUT</span>
                         </div>
                      )}

                      <button onClick={(e) => toggleFavorite(e, event.id)} className="absolute top-3 right-3 p-2 rounded-full bg-white/80 backdrop-blur hover:bg-white transition z-20 shadow-sm">
                        <Heart size={20} className={isFav ? "fill-brand text-brand" : "text-gray-400"} />
                      </button>
                      <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded uppercase">{event.category}</div>
                    </div>
                  )}

                  {/* GÖRSEL YOKSA FAVORİ BUTONU İÇERİYE GELİR */}
                  {!event.image_url && (
                     <button onClick={(e) => toggleFavorite(e, event.id)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition z-20">
                       <Heart size={20} className={isFav ? "fill-brand text-brand" : "text-gray-400"} />
                     </button>
                  )}

                  <div className="p-5">
                    {isRecommended && !isSoldOut && <div className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 text-[10px] font-black px-2 py-0.5 rounded mb-2"><Star size={10}/> SENİN İÇİN</div>}

                    <h3 className={`font-bold text-xl text-gray-900 leading-tight mb-2 transition-colors ${!event.image_url && 'pr-10 group-hover:text-brand'}`}>{event.title}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-4">{event.description}</p>

                    <div className="flex items-center gap-4 mb-4 text-xs font-medium text-gray-500">
                        <div className="flex items-center gap-1"><MapPin size={14}/> {event.venue_name}</div>
                        <div className="flex items-center gap-1"><Calendar size={14}/> {new Date(event.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                    </div>

                    <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                       <button onClick={(e) => openDirections(e, event)} className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-bold transition"><Map size={16}/> Yol Tarifi</button>

                       {/* FİYAT / BİLET BUTONU MANTIĞI */}
                       {isSoldOut ? (
                         <div className="flex-1 flex items-center justify-center gap-2 bg-gray-200 text-gray-500 py-2.5 rounded-xl text-xs font-bold cursor-not-allowed">
                           <Ban size={16}/> Tükendi
                         </div>
                       ) : isFree ? (
                         <div className="flex-1 flex items-center justify-center gap-2 bg-green-100 text-green-800 py-2.5 rounded-xl text-xs font-bold">Ücretsiz</div>
                       ) : (
                         <button onClick={(e) => openTicket(e, event.ticket_url)} className="flex-1 flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white py-2.5 rounded-xl text-xs font-bold transition shadow-md">
                           {event.ticket_url ? <><Ticket size={16}/> Bilet Al</> : <>{event.price}</>}
                         </button>
                       )}
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