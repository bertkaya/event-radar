// app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { MapPin, Calendar, Navigation, Filter, Star, LogOut, Heart, Share2, Ticket, Map, Ban, X, Clock, CheckCircle, ChevronDown, Globe, ArrowUpDown, Banknote, CalendarPlus, Music, Send, Store, Mail, Utensils, Sparkles, Info, Instagram, Twitter, MessageCircle, Download, User } from 'lucide-react'
import Link from 'next/link'
import SkeletonCard from '@/components/Skeleton'

const MapWithNoSSR = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-brand font-bold">Harita Yükleniyor...</div>
})

const PRESET_LOCATIONS = [
  { name: 'Ankara (Tümü)', lat: 39.9208, lng: 32.8541, zoom: 12 },
  { name: '• Çankaya / Tunalı', lat: 39.9032, lng: 32.8644, zoom: 14 },
  { name: '• Bahçelievler', lat: 39.9215, lng: 32.8225, zoom: 15 },
  { name: '• Kızılay', lat: 39.9208, lng: 32.8541, zoom: 15 },
  { name: '• Ümitköy / Çayyolu', lat: 39.8914, lng: 32.7103, zoom: 13 },
  { name: 'İstanbul', lat: 41.0082, lng: 28.9784, zoom: 11 },
  { name: 'İzmir', lat: 38.4237, lng: 27.1428, zoom: 12 },
]
// MOOD MANTIĞI (Hangi mod hangi kategorileri kapsar?)
const MOODS: { [key: string]: string[] } = {
  'Kopmalık 🎸': ['Müzik', 'Spor'],
  'Chill & Sanat 🎨': ['Tiyatro', 'Sanat', 'Sinema'],
  'Date Night 🍷': ['Yeme-İçme', 'Müzik', 'Tiyatro'],
  'Ailece 👨‍👩‍👧‍👦': ['Çocuk', 'Workshop', 'Sinema'],
  'Kendini Geliştir 🧠': ['Workshop', 'Sanat']
}

export default function Home() {
  const [events, setEvents] = useState<any[]>([])
  const [allEvents, setAllEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true) // Yükleniyor durumu
  const [userPrefs, setUserPrefs] = useState<string[]>([])
  const [favorites, setFavorites] = useState<number[]>([])
  const [favCounts, setFavCounts] = useState<{ [key: number]: number }>({})
  const [selectedEvent, setSelectedEvent] = useState<any>(null)

  const [activeCategory, setActiveCategory] = useState<string>('Tümü')
  const [activeMood, setActiveMood] = useState<string>('Tümü') // YENİ: Mood Filtresi
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'tomorrow' | 'weekend'>('all')
  const [sortBy, setSortBy] = useState<'date-asc' | 'date-desc' | 'popular'>('date-asc')
  const [priceFilter, setPriceFilter] = useState<'all' | 'free'>('all')

  const [triggerLocate, setTriggerLocate] = useState(false)
  const [manualLocation, setManualLocation] = useState<any>(null)
  const [showLocModal, setShowLocModal] = useState(false)
  const [showVenueModal, setShowVenueModal] = useState(false)
  const [showVenueEventsModal, setShowVenueEventsModal] = useState<string | null>(null) // Venue Name

  const [currentLocName, setCurrentLocName] = useState('İstanbul')
  const [user, setUser] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [venueForm, setVenueForm] = useState({ venue_name: '', contact_name: '', phone: '', email: '', message: '' })

  useEffect(() => { fetchData() }, [])
  useEffect(() => { applyFilters() }, [activeCategory, activeMood, timeFilter, sortBy, priceFilter, allEvents, favCounts])

  const fetchData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    let preferences: string[] = []
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('preferences').eq('id', user.id).single()
      if (profile?.preferences) { preferences = profile.preferences; setUserPrefs(preferences) }
      const { data: favs } = await supabase.from('favorites').select('event_id').eq('user_id', user.id)
      if (favs) setFavorites(favs.map(f => f.event_id))
    }

    const { data: allFavs } = await supabase.from('favorites').select('event_id')
    const counts: { [key: number]: number } = {}
    allFavs?.forEach((f: any) => { counts[f.event_id] = (counts[f.event_id] || 0) + 1 })
    setFavCounts(counts)

    const { data: eventsData } = await supabase.from('events').select('*, organizers(name, logo_url)').eq('is_approved', true)

    if (eventsData) {
      const jitteredEvents = eventsData.map(ev => ({
        ...ev,
        lat: ev.lat + (Math.random() - 0.5) * 0.0002,
        lng: ev.lng + (Math.random() - 0.5) * 0.0002
      }))
      setAllEvents(jitteredEvents)
    }
    setLoading(false)
  }

  const applyFilters = () => {
    let filtered = [...allEvents]

    // Kategori
    if (activeCategory !== 'Tümü') filtered = filtered.filter(e => e.category === activeCategory)

    // Mood (Ruh Hali)
    if (activeMood !== 'Tümü') {
      const allowedCategories = MOODS[activeMood]
      filtered = filtered.filter(e => allowedCategories.includes(e.category))
    }

    // Fiyat
    if (priceFilter === 'free') filtered = filtered.filter(e => e.price?.toLowerCase().includes('ücretsiz') || e.price === '0' || e.price === '')

    // 18-23 Zaman Filtresi
    if (timeFilter !== 'all') {
      const today = new Date();
      const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
      filtered = filtered.filter(e => {
        const eventDate = new Date(e.start_time);
        const hour = eventDate.getHours();
        if (hour < 18) return false;
        if (timeFilter === 'today') return eventDate.toDateString() === today.toDateString();
        if (timeFilter === 'tomorrow') return eventDate.toDateString() === tomorrow.toDateString();
        if (timeFilter === 'weekend') { const day = eventDate.getDay(); return day === 0 || day === 6 || (day === 5 && hour >= 18); }
        return true;
      });
    }

    // Sıralama
    filtered.sort((a, b) => {
      if (sortBy === 'date-asc') return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      else if (sortBy === 'date-desc') return new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      else if (sortBy === 'popular') { const countA = favCounts[a.id] || 0; const countB = favCounts[b.id] || 0; return countB - countA }
      return 0
    })
    setEvents(filtered)
  }

  const toggleFavorite = async (e: any, eventId: number, category: string) => {
    e?.stopPropagation()
    if (!user) return alert('Favorilere eklemek için giriş yapmalısın!')
    if (favorites.includes(eventId)) {
      setFavorites(favorites.filter(id => id !== eventId))
      setFavCounts(prev => ({ ...prev, [eventId]: Math.max(0, (prev[eventId] || 1) - 1) }))
      await supabase.from('favorites').delete().match({ user_id: user.id, event_id: eventId })
    } else {
      setFavorites([...favorites, eventId])
      setFavCounts(prev => ({ ...prev, [eventId]: (prev[eventId] || 0) + 1 }))
      await supabase.from('favorites').insert([{ user_id: user.id, event_id: eventId }])
      await supabase.from('analytics').insert([{ event_id: eventId, category: category, action_type: 'favorite' }])
    }
  }

  // --- SOCIAL SHERE ---
  const handleShare = async (event: any, platform?: 'whatsapp' | 'twitter' | 'instagram') => {
    const shareText = `🔥 ${event.title} @ ${event.venue_name}\n🗓️ ${formatDateRange(event.start_time, event.end_time)}\n\nLink: https://event-radar.vercel.app`
    const url = 'https://event-radar.vercel.app';

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank')
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank')
    } else if (platform === 'instagram') {
      alert('Instagram hikaye paylaşımı mobilde kopyalayarak yapılabilir. Metin kopyalandı!')
      navigator.clipboard.writeText(shareText);
    } else {
      // Native or Copy
      if (navigator.share) { try { await navigator.share({ title: event.title, text: shareText, url }) } catch (err) { } }
      else { navigator.clipboard.writeText(shareText); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    }
    await supabase.from('analytics').insert([{ event_id: event.id, category: event.category, action_type: 'share' }])
  }

  // --- CALENDAR ---
  const addToCalendar = (event: any, type: 'google' | 'ical') => {
    const startTime = new Date(event.start_time).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const endTime = event.end_time
      ? new Date(event.end_time).toISOString().replace(/-|:|\.\d\d\d/g, "")
      : new Date(new Date(event.start_time).getTime() + 2 * 60 * 60 * 1000).toISOString().replace(/-|:|\.\d\d\d/g, "");

    const details = `${event.description}\n\nKurallar: ${event.rules || 'Yok'}\n18-23 App ile keşfedildi.`;

    if (type === 'google') {
      const googleUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startTime}/${endTime}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(event.venue_name + ", " + event.address)}&sf=true&output=xml`;
      window.open(googleUrl, '_blank');
    } else {
      // iCal Download
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
URL:${event.ticket_url || 'https://event-radar.vercel.app'}
DTSTART:${startTime}
DTEND:${endTime}
SUMMARY:${event.title}
DESCRIPTION:${details.replace(/\n/g, '\\n')}
LOCATION:${event.venue_name}, ${event.address}
END:VEVENT
END:VCALENDAR`;
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute('download', `${event.title}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    supabase.from('analytics').insert([{ event_id: event.id, category: event.category, action_type: 'calendar' }])
  }

  const openNearbyRestaurants = (venue: string, lat: number, lng: number) => {
    const url = `https://www.google.com/maps/search/restaurants/@${lat},${lng},16z/data=!3m1!4b1?q=restaurants+near+${encodeURIComponent(venue)}`;
    window.open(url, '_blank');
  }

  const handleVenueSubmit = async (e: any) => {
    e.preventDefault();
    const { error } = await supabase.from('venue_applications').insert([venueForm]);
    if (!error) { alert('Başvurunuz alındı!'); setShowVenueModal(false); setVenueForm({ venue_name: '', contact_name: '', phone: '', email: '', message: '' }) }
    else { alert('Hata oluştu.') }
  }

  const openDirections = (e: any, event: any) => {
    e?.stopPropagation()
    if (event.maps_url) window.open(event.maps_url, '_blank')
    else window.open(`http://googleusercontent.com/maps.google.com/?q=${event.lat},${event.lng}`, '_blank')
  }

  const openTicket = (e: any, url: string) => { e?.stopPropagation(); window.open(url, '_blank') }
  const categories = ['Tümü', ...Array.from(new Set(allEvents.map(e => e.category)))]
  const handleLocate = () => { setTriggerLocate(true); setCurrentLocName("Konumum"); setTimeout(() => setTriggerLocate(false), 1000) }
  const handleSelectLocation = (loc: any) => { setManualLocation(loc); setCurrentLocName(loc.name.replace('• ', '')); setShowLocModal(false) }

  // DATE FORMATTERS
  const formatEuroDateTime = (dateStr: string) => { const d = new Date(dateStr); return `${d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` }

  const formatDateRange = (start: string, end?: string) => {
    const s = new Date(start);
    if (!end) return formatEuroDateTime(start);
    const e = new Date(end);
    if (s.toDateString() === e.toDateString()) {
      return `${s.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} ${s.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} - ${e.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
    }
    return `${s.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} - ${e.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} (${s.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })})`
  }

  const formatHumanDate = (dateStr: string) => {
    const date = new Date(dateStr); const today = new Date(); const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
    if (date.toDateString() === today.toDateString()) return 'Bugün'; if (date.toDateString() === tomorrow.toDateString()) return 'Yarın'
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })
  }

  return (
    <div className="flex flex-col h-screen w-full bg-white dark:bg-gray-900 text-black dark:text-gray-100 font-sans overflow-hidden transition-colors">

      {/* LOC MODAL */}
      {showLocModal && (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><Globe size={18} /> Konum Değiştir</h3>
              <button onClick={() => setShowLocModal(false)}><X size={20} className="text-gray-500" /></button>
            </div>
            <div className="p-2 max-h-[60vh] overflow-y-auto">
              {PRESET_LOCATIONS.map((loc) => (
                <button key={loc.name} onClick={() => handleSelectLocation(loc)} className="w-full text-left p-3 hover:bg-brand/5 dark:hover:bg-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-50 dark:border-gray-700 last:border-0 transition-colors">{loc.name}</button>
              ))}
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700">
              <button onClick={() => { handleLocate(); setShowLocModal(false); }} className="w-full bg-black dark:bg-white dark:text-black text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"><Navigation size={16} /> Konumumu Bul (GPS)</button>
            </div>
          </div>
        </div>
      )}

      {/* VENUE APPLY MODAL */}
      {showVenueModal && (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b dark:border-gray-700 bg-brand text-white text-center relative">
              <h3 className="font-black text-xl tracking-tight">MEKANINI EKLE</h3>
              <p className="text-xs opacity-90">18-23 Ailesine Katılın</p>
              <button onClick={() => setShowVenueModal(false)} className="absolute top-4 right-4 text-white/80 hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleVenueSubmit} className="space-y-3">
                <input required placeholder="Mekan Adı" className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600" value={venueForm.venue_name} onChange={e => setVenueForm({ ...venueForm, venue_name: e.target.value })} />
                <input required placeholder="Yetkili Kişi" className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600" value={venueForm.contact_name} onChange={e => setVenueForm({ ...venueForm, contact_name: e.target.value })} />
                <div className="flex gap-2">
                  <input required placeholder="Telefon" className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600" value={venueForm.phone} onChange={e => setVenueForm({ ...venueForm, phone: e.target.value })} />
                  <input required placeholder="E-mail" className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600" value={venueForm.email} onChange={e => setVenueForm({ ...venueForm, email: e.target.value })} />
                </div>
                <textarea placeholder="Mesajınız..." className="w-full border p-3 rounded-lg h-20 resize-none dark:bg-gray-700 dark:border-gray-600" value={venueForm.message} onChange={e => setVenueForm({ ...venueForm, message: e.target.value })} />
                <button className="w-full bg-black text-white dark:bg-white dark:text-black py-3 rounded-xl font-bold">Başvuru Gönder</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* VENUE EVENTS MODAL (NEW) */}
      {showVenueEventsModal && (
        <div className="fixed inset-0 z-[2200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center gap-2 font-bold"><Store size={18} /> Mekandaki Diğer Etkinlikler</div>
              <button onClick={() => setShowVenueEventsModal(null)}><X size={20} /></button>
            </div>
            <div className="p-4 overflow-y-auto space-y-3 bg-gray-50 dark:bg-black/20 flex-1">
              {allEvents.filter(e => e.venue_name === showVenueEventsModal).length === 0 && <div className="text-gray-500 text-center">Başka etkinlik bulunamadı.</div>}
              {allEvents.filter(e => e.venue_name === showVenueEventsModal).map(e => (
                <div key={e.id} onClick={() => { setSelectedEvent(e); setShowVenueEventsModal(null); }} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 flex gap-3 cursor-pointer hover:border-brand/50 transition">
                  {e.image_url && <img src={e.image_url} className="w-16 h-16 object-cover rounded-lg bg-gray-200" />}
                  <div>
                    <div className="font-bold text-sm leading-tight">{e.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{formatDateRange(e.start_time)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}></div>
          <div className="bg-white dark:bg-gray-800 w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-3xl shadow-2xl relative flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 z-30 bg-black/50 hover:bg-black text-white p-2 rounded-full backdrop-blur transition"><X size={24} /></button>

            <div className="h-64 md:h-72 bg-brand relative shrink-0 flex items-center justify-center overflow-hidden">
              {selectedEvent.image_url ? (
                <img src={selectedEvent.image_url} className={`w-full h-full object-cover ${selectedEvent.sold_out ? 'grayscale' : ''}`} />
              ) : (
                <div className="text-white font-black text-5xl tracking-tighter opacity-50">18-23</div>
              )}
              {selectedEvent.image_url && <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-white dark:from-gray-800 to-transparent"></div>}
            </div>

            <div className={`p-6 overflow-y-auto flex-1 ${!selectedEvent.image_url && 'pt-6'}`}>
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white leading-tight w-3/4">{selectedEvent.title}</h2>
                {userPrefs.includes(selectedEvent.category) && !selectedEvent.sold_out && <div className="flex flex-col items-center"><Star size={24} className="fill-yellow-400 text-yellow-400" /><span className="text-[10px] font-bold text-gray-400">Önerilen</span></div>}
              </div>

              {selectedEvent.tags && selectedEvent.tags.length > 0 && (
                <div className="flex gap-2 mb-4 flex-wrap">
                  {selectedEvent.tags.map((tag: string) => <span key={tag} className="text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full uppercase tracking-wider">{tag}</span>)}
                </div>
              )}

              {selectedEvent.organizers && (
                <div className="flex items-center gap-2 mb-4 text-gray-500 dark:text-gray-400">
                  <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-full"><User size={14} /></div>
                  <span className="text-xs font-bold">{selectedEvent.organizers.name}</span>
                </div>
              )}

              <div className="flex flex-col gap-3 mb-6 bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm text-brand"><Calendar size={20} /></div>
                  <div><div className="text-xs font-bold text-gray-400 uppercase">Tarih</div><div className="font-bold text-lg">{formatDateRange(selectedEvent.start_time, selectedEvent.end_time)}</div></div>
                </div>
                <div className="w-full h-[1px] bg-gray-200 dark:bg-gray-700"></div>
                <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm text-brand"><MapPin size={20} /></div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-gray-400 uppercase">Mekan</div>
                    <div className="font-bold text-lg">{selectedEvent.venue_name}</div>
                    {selectedEvent.address && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-tight">{selectedEvent.address}</div>}
                  </div>
                  <button onClick={() => setShowVenueEventsModal(selectedEvent.venue_name)} className="text-xs bg-brand/10 text-brand px-2 py-1 rounded font-bold hover:bg-brand/20">Diğer Etkinlikler</button>
                </div>
              </div>

              <div className="mb-8 space-y-6">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">Etkinlik Hakkında</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">{selectedEvent.description || 'Açıklama bulunmuyor.'}</p>
                </div>

                {selectedEvent.rules && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl border border-yellow-100 dark:border-yellow-900/20">
                    <h3 className="font-bold text-yellow-800 dark:text-yellow-500 mb-2 flex items-center gap-2"><Info size={16} /> Good to Know / Kurallar</h3>
                    <p className="text-sm text-yellow-900 dark:text-yellow-200/80 whitespace-pre-line">{selectedEvent.rules}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mt-4">
                  <button onClick={() => openNearbyRestaurants(selectedEvent.venue_name, selectedEvent.lat, selectedEvent.lng)} className="flex items-center gap-2 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-100 px-3 py-2 rounded-lg font-bold text-xs hover:bg-orange-200 transition">
                    <Utensils size={14} /> Yemek
                  </button>
                  {selectedEvent.media_url && (
                    <button onClick={() => window.open(selectedEvent.media_url, '_blank')} className="flex items-center gap-2 bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-100 px-3 py-2 rounded-lg font-bold text-xs hover:bg-pink-200 transition">
                      <Music size={14} /> Medya
                    </button>
                  )}
                </div>

                <div className="pt-4 border-t dark:border-gray-700">
                  <div className="text-xs font-bold text-gray-400 mb-2 uppercase flex items-center gap-1"><Share2 size={12} /> Paylaş</div>
                  <div className="flex gap-2">
                    <button onClick={() => handleShare(selectedEvent, 'whatsapp')} className="p-2 bg-[#25D366]/10 text-[#25D366] rounded-lg hover:bg-[#25D366]/20 transition"><MessageCircle size={20} /></button>
                    <button onClick={() => handleShare(selectedEvent, 'instagram')} className="p-2 bg-[#E1306C]/10 text-[#E1306C] rounded-lg hover:bg-[#E1306C]/20 transition"><Instagram size={20} /></button>
                    <button onClick={() => handleShare(selectedEvent, 'twitter')} className="p-2 bg-[#1DA1F2]/10 text-[#1DA1F2] rounded-lg hover:bg-[#1DA1F2]/20 transition"><Twitter size={20} /></button>
                    <button onClick={() => handleShare(selectedEvent)} className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg"><Share2 size={20} /></button>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="text-xs font-bold text-gray-400 mb-2 uppercase flex items-center gap-1"><CalendarPlus size={12} /> Takvime Ekle</div>
                  <div className="flex gap-2">
                    <button onClick={() => addToCalendar(selectedEvent, 'google')} className="flex items-center gap-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-blue-100 transition">Google Calendar</button>
                    <button onClick={() => addToCalendar(selectedEvent, 'ical')} className="flex items-center gap-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-gray-200 transition">Apple / iCaL (.ics)</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center gap-3 shrink-0 pb-8 md:pb-4">
              <button onClick={(e) => toggleFavorite(e, selectedEvent.id, selectedEvent.category)} className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition"><Heart size={24} className={favorites.includes(selectedEvent.id) ? "fill-brand text-brand" : ""} /></button>
              {selectedEvent.sold_out ? (
                <div className="flex-1 bg-gray-300 dark:bg-gray-700 text-gray-500 font-bold py-3 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"><Ban size={20} /> TÜKENDİ</div>
              ) : (
                <button onClick={(e) => openTicket(e, selectedEvent.ticket_url)} className="flex-1 bg-brand hover:bg-brand-dark text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition transform active:scale-95"><Ticket size={20} />{selectedEvent.price?.toLowerCase().includes('ücretsiz') || selectedEvent.price === '0' ? 'ÜCRETSİZ KATIL' : `BİLET AL (${selectedEvent.price})`}</button>
              )}
              <button onClick={(e) => openDirections(e, selectedEvent)} className="p-3 rounded-xl bg-black dark:bg-white dark:text-black text-white hover:bg-gray-800 transition" title="Yol Tarifi"><Navigation size={24} /></button>
            </div>
          </div>
        </div>
      )}

      <header className="h-[70px] bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 flex justify-between items-center z-50 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2"><div className="bg-brand text-white font-black text-xl px-3 py-1 tracking-tighter rounded-sm">18-23</div></div>
          <button onClick={() => setShowLocModal(true)} className="flex items-center gap-1 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1.5 rounded-full transition"><MapPin size={16} className="text-brand" />{currentLocName}<ChevronDown size={14} className="text-gray-400" /></button>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <Link href="/profile" className="text-right hidden md:block hover:opacity-70 transition cursor-pointer"><div className="text-xs font-bold text-gray-900 dark:text-white">{user.email.split('@')[0]}</div><div className="text-[10px] text-gray-500 dark:text-gray-400 flex justify-end gap-1"><span>{favorites.length} Favori</span></div></Link>
              <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} className="text-gray-400 hover:text-brand transition"><LogOut size={18} /></button>
            </div>
          ) : (
            <Link href="/login" className="text-xs font-bold bg-black dark:bg-white dark:text-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition">Giriş Yap</Link>
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row overflow-hidden relative">
        <div className="h-[40%] md:h-full md:w-[60%] bg-gray-100 dark:bg-gray-900 relative order-1 md:order-2">
          <MapWithNoSSR events={events} selectedEvent={selectedEvent} triggerLocate={triggerLocate} markerMode="title" manualLocation={manualLocation} />
          <button onClick={handleLocate} className="absolute top-4 right-4 z-[1000] bg-white dark:bg-gray-800 p-3 rounded-xl shadow-lg hover:bg-brand hover:text-white transition text-gray-700 dark:text-white border border-gray-200 dark:border-gray-700"><Navigation size={20} /></button>
          <div className="md:hidden absolute top-4 left-4 right-16 z-[900] overflow-x-auto no-scrollbar">
            <div className="flex gap-2">
              {categories.map(cat => (<button key={cat} onClick={() => setActiveCategory(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-md whitespace-nowrap backdrop-blur-md ${activeCategory === cat ? 'bg-brand text-white' : 'bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-white'}`}>{cat}</button>))}
            </div>
          </div>
        </div>

        <div className="h-[60%] md:h-full md:w-[40%] bg-white dark:bg-gray-900 order-2 md:order-1 border-r border-gray-200 dark:border-gray-700 flex flex-col shadow-2xl relative z-20">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0 space-y-3">
            <div className="flex justify-between items-center"><h1 className="text-2xl font-black tracking-tighter text-gray-900 dark:text-white">AKIŞ</h1><div className="text-[10px] font-bold text-gray-400">{loading ? '...' : events.length} Etkinlik</div></div>

            {/* MOOD VE DİĞER FİLTRELER */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 shrink-0">
                <button onClick={() => setTimeFilter('all')} className={`px-3 py-1 rounded-md text-xs font-bold ${timeFilter === 'all' ? 'bg-white dark:bg-gray-700 shadow-sm text-black dark:text-white' : 'text-gray-500'}`}>Tümü</button>
                <button onClick={() => setTimeFilter('today')} className={`px-3 py-1 rounded-md text-xs font-bold ${timeFilter === 'today' ? 'bg-white dark:bg-gray-700 shadow-sm text-brand' : 'text-gray-500'}`}>Bugün Akşam</button>
                <button onClick={() => setTimeFilter('tomorrow')} className={`px-3 py-1 rounded-md text-xs font-bold ${timeFilter === 'tomorrow' ? 'bg-white dark:bg-gray-700 shadow-sm text-brand' : 'text-gray-500'}`}>Yarın Akşam</button>
                <button onClick={() => setTimeFilter('weekend')} className={`px-3 py-1 rounded-md text-xs font-bold ${timeFilter === 'weekend' ? 'bg-white dark:bg-gray-700 shadow-sm text-brand' : 'text-gray-500'}`}>Hafta Sonu</button>
                <div className="w-[1px] h-4 bg-gray-300 dark:bg-gray-700 mx-1"></div>
                <button onClick={() => setPriceFilter(priceFilter === 'all' ? 'free' : 'all')} className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1 ${priceFilter === 'free' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100' : 'text-gray-500'}`}><Banknote size={14} /> Ücretsiz</button>
              </div>

              <select value={activeMood} onChange={(e) => { setActiveMood(e.target.value); setActiveCategory('Tümü'); }} className="bg-gray-100 dark:bg-gray-800 dark:text-white text-xs font-bold p-2 rounded-lg border-none focus:ring-0 outline-none cursor-pointer shrink-0">
                <option value="Tümü">Mood (Ruh Hali)</option>
                {Object.keys(MOODS).map(m => <option key={m} value={m}>{m}</option>)}
              </select>

              <select value={activeCategory} onChange={(e) => setActiveCategory(e.target.value)} className="bg-gray-100 dark:bg-gray-800 dark:text-white text-xs font-bold p-2 rounded-lg border-none focus:ring-0 outline-none cursor-pointer shrink-0"><option value="Tümü">Kategori</option>{Array.from(new Set(allEvents.map(e => e.category))).map(c => <option key={c} value={c}>{c}</option>)}</select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50 dark:bg-black/20">
            {loading && [1, 2, 3].map(i => <SkeletonCard key={i} />)}
            {!loading && events.length === 0 && <div className="text-center text-gray-400 mt-10 text-sm font-medium">Bu filtreye uygun etkinlik bulunamadı.</div>}
            {!loading && events.map((event) => {
              const isRecommended = userPrefs.includes(event.category);
              const isFav = favorites.includes(event.id);
              const isSoldOut = event.sold_out;
              return (
                <div key={event.id} onClick={() => setSelectedEvent(event)} className={`group bg-white dark:bg-gray-800 rounded-3xl cursor-pointer transition-all border border-gray-100 dark:border-gray-700 relative overflow-hidden flex flex-row md:flex-col items-stretch md:items-stretch h-32 md:h-auto hover:shadow-lg hover:border-brand/30 ${!event.image_url ? 'h-auto' : ''}`}>
                  {event.image_url && (
                    <div className="w-32 h-full md:w-full md:h-40 bg-brand shrink-0 relative flex items-center justify-center overflow-hidden">
                      <img src={event.image_url} alt={event.title} className={`w-full h-full object-cover ${isSoldOut ? 'grayscale' : ''}`} />
                      {isSoldOut && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-[10px] font-bold text-white bg-red-600 px-1 rounded">TÜKENDİ</span></div>}
                      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase md:block hidden">{event.category}</div>
                    </div>
                  )}
                  <div className="p-3 md:p-4 flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-1">
                      {!event.image_url && <span className="text-[10px] font-bold uppercase text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{event.category}</span>}
                      {event.image_url && <div className="md:hidden"></div>}
                      <span className="text-xs font-black text-brand bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded whitespace-nowrap ml-auto">{event.price === '0' || event.price?.toLowerCase().includes('ücretsiz') ? 'Ücretsiz' : event.price}</span>
                    </div>
                    <div>
                      <div className="flex items-center justify-between"><h3 className="font-bold text-sm md:text-lg text-gray-900 dark:text-white leading-tight line-clamp-2">{event.title}</h3>{isRecommended && !isSoldOut && <Star size={12} className="fill-yellow-400 text-yellow-400 shrink-0 ml-1" />}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1 truncate"><MapPin size={12} /> {event.venue_name}</div>
                    </div>
                    <div className="flex justify-between items-end mt-2">
                      <div className="text-xs text-gray-400 font-medium">{formatDateRange(event.start_time, event.end_time)}</div>
                      <button onClick={(e) => toggleFavorite(e, event.id, event.category)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 z-10 relative"><Heart size={16} className={isFav ? "fill-brand text-brand" : ""} /></button>
                    </div>
                  </div>
                </div>
              )
            })}

            <div className="flex justify-center gap-4 py-6 border-t dark:border-gray-700 mt-4">
              <button onClick={() => setShowVenueModal(true)} className="text-xs font-bold text-gray-500 hover:text-brand flex items-center gap-1"><Store size={14} /> Mekanını Ekle</button>
              <a href="mailto:iletisim@18-23.com" className="text-xs font-bold text-gray-500 hover:text-brand flex items-center gap-1"><Mail size={14} /> Bize Ulaşın</a>
            </div>
            <div className="h-8"></div>
          </div>
        </div>
      </div>
    </div>
  )
}