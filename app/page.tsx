// app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { 
  MapPin, Calendar, Navigation, Filter, Star, LogOut, Heart, Share2, Ticket, Map, Ban, X, Clock, 
  CheckCircle, ChevronDown, Globe, ArrowUpDown, Banknote, CalendarPlus, Music, Send, Store, Mail, 
  Utensils, Sparkles, Info, Instagram, Twitter, MessageCircle, Download, User, Bell, Check, Plus,
  Compass, Shuffle, Moon, Zap, Users, Flame, Smile, Search, HelpCircle, Footprints, Car
} from 'lucide-react'
import Link from 'next/link'
import SkeletonCard from '@/components/Skeleton'
import type { Event } from '@/lib/types'
import { fakeEvents } from '@/lib/data'
import { getDistanceFromLatLonInKm, formatPrice } from '@/lib/utils'
import { deduplicateEvents } from '@/lib/dedup'
import { rankEvents, ScoredEvent } from '@/lib/recommendation'
import { generateNightPlans, NightPlan } from '@/lib/night_planner'
import { parseNaturalLanguageQuery } from '@/lib/nlp_filter'

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

// Standart Kategoriler (Admin ile uyumlu)
const CATEGORIES = ['Müzik', 'Tiyatro', 'Stand-Up', 'Spor', 'Aile', 'Sanat', 'Eğitim', 'Festival', 'Sinema', 'Parti', 'Yeme-İçme']

// MOOD MANTIĞI (Hangi mod hangi kategorileri kapsar?)
const MOODS: { [key: string]: string[] } = {
  'Kopmalık 🎸': ['Müzik', 'Spor'],
  'Chill & Sanat 🎨': ['Tiyatro', 'Sanat', 'Sinema'],
  'Date Night 🍷': ['Yeme-İçme', 'Müzik', 'Tiyatro'],
  'Ailece 👨‍👩‍👧‍👦': ['Çocuk', 'Workshop', 'Sinema'],
  'Kendini Geliştir 🧠': ['Workshop', 'Sanat']
}


export default function Home() {
  const [events, setEvents] = useState<ScoredEvent[]>([])
  const [allEvents, setAllEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true) // Yükleniyor durumu
  const [userPrefs, setUserPrefs] = useState<string[]>([])
  const [favorites, setFavorites] = useState<number[]>([])
  const [favCounts, setFavCounts] = useState<{ [key: number]: number }>({})
  const [selectedEvent, setSelectedEvent] = useState<any>(null)

  // 11 Core Product Modes
  const [discoveryMode, setDiscoveryMode] = useState<
    'all' | 'tonight' | 'afterwork' | 'tomorrow' | 'weekend' | 'nearme' | 'date' | 'friends' | 'solo' | 'family' | 'free'
  >('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)

  // AI Night Planner State
  const [showNightPlannerModal, setShowNightPlannerModal] = useState(false)
  const [nightPlans, setNightPlans] = useState<NightPlan[]>([])
  const [plannerInput, setPlannerInput] = useState<{
    city: string;
    budget: number;
    partyType: 'date' | 'friends' | 'solo' | 'family';
    mood: string;
  }>({
    city: 'İstanbul',
    budget: 1500,
    partyType: 'date',
    mood: 'Date Night 🍷'
  })

  // Surprise Me State
  const [showSurpriseModal, setShowSurpriseModal] = useState(false)
  const [surpriseEvent, setSurpriseEvent] = useState<ScoredEvent | null>(null)

  // Mobile View Switcher (Feed vs Map)
  const [mobileTab, setMobileTab] = useState<'feed' | 'map'>('feed')

  const [activeCategory, setActiveCategory] = useState<string>('Tümü')
  const [activeMood, setActiveMood] = useState<string>('Tümü') // Mood Filtresi
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'tomorrow' | 'weekend'>('all')
  const [sortBy, setSortBy] = useState<'date-asc' | 'date-desc' | 'popular' | 'match'>('match')
  const [priceFilter, setPriceFilter] = useState<'all' | 'free'>('all')
  const [priceRange, setPriceRange] = useState<number[]>([0, 5000]) // [min, max]
  const [cityFilter, setCityFilter] = useState<{ lat: number, lng: number } | null>(null) // City Filter (Center)

  const [triggerLocate, setTriggerLocate] = useState(false)
  const [manualLocation, setManualLocation] = useState<any>(null)
  const [showLocModal, setShowLocModal] = useState(false)
  const [showVenueModal, setShowVenueModal] = useState(false)
  const [showVenueEventsModal, setShowVenueEventsModal] = useState<string | null>(null) // Venue Name

  const [currentLocName, setCurrentLocName] = useState('İstanbul')
  const [user, setUser] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [venueForm, setVenueForm] = useState({ venue_name: '', contact_name: '', phone: '', email: '', message: '' })
  const [showSuggestModal, setShowSuggestModal] = useState(false)
  const [suggestForm, setSuggestForm] = useState({ title: '', event_url: '', notes: '', contact_email: '' })

  // Phase 3: User Engagement State
  const [followedVenues, setFollowedVenues] = useState<string[]>([])
  const [notifications, setNotifications] = useState<any[]>([])

  // Phase 5: Reviews State
  const [eventReviews, setEventReviews] = useState<any[]>([])
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const [submittingReview, setSubmittingReview] = useState(false)

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      // Preferences
      const { data: profile } = await supabase.from('profiles').select('preferences').eq('id', user.id).single()
      if (profile?.preferences) setUserPrefs(profile.preferences)

      // Favorites
      const { data: favs } = await supabase.from('favorites').select('event_id').eq('user_id', user.id)
      if (favs) setFavorites(favs.map(f => f.event_id))

      // Follows (Phase 3)
      const { data: follows } = await supabase.from('follows').select('entity_id').eq('user_id', user.id).eq('entity_type', 'venue')
      if (follows) setFollowedVenues(follows.map(f => f.entity_id))

      // Notifications (Phase 3)
      const { data: notifs } = await supabase.from('notifications').select('*').eq('user_id', user.id).eq('is_read', false).order('created_at', { ascending: false })
      if (notifs) setNotifications(notifs)
    }
  }

  const toggleFollow = async (venueName: string) => {
    if (!user) {
      alert('Lütfen giriş yapınız.');
      return
    }
    const isFollowing = followedVenues.includes(venueName)
    let newFollows = [...followedVenues]

    if (isFollowing) {
      newFollows = newFollows.filter(v => v !== venueName)
      await supabase.from('follows').delete().match({ user_id: user.id, entity_type: 'venue', entity_id: venueName })
    } else {
      newFollows.push(venueName)
      await supabase.from('follows').insert({ user_id: user.id, entity_type: 'venue', entity_id: venueName })
    }
    setFollowedVenues(newFollows)
  }

  useEffect(() => { fetchData() }, [])
  useEffect(() => { 
    applyFilters() 
  }, [activeCategory, activeMood, timeFilter, discoveryMode, searchQuery, sortBy, priceFilter, allEvents, favCounts, cityFilter, priceRange, userCoords, userPrefs])

  const fetchData = async () => {
    setLoading(true)
    await fetchUserData()

    const { data: allFavs } = await supabase.from('favorites').select('event_id')
    const counts: { [key: number]: number } = {}
    allFavs?.forEach((f: any) => { counts[f.event_id] = (counts[f.event_id] || 0) + 1 })
    setFavCounts(counts)

    const { data: eventsData } = await supabase
      .from('events')
      .select('*, organizers(name, logo_url)')
      .eq('is_approved', true)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });

    const activeList = (eventsData && eventsData.length > 0) ? eventsData : fakeEvents;
    
    // 1. Intelligent Deduplication across ticket vendors (Biletix, Passo, Bubilet, Biletinial)
    const deduplicated = deduplicateEvents(activeList);

    const jitteredEvents = deduplicated.map(ev => ({
      ...ev,
      lat: ev.lat + (Math.random() - 0.5) * 0.0002,
      lng: ev.lng + (Math.random() - 0.5) * 0.0002
    }))
    setAllEvents(jitteredEvents)
    setLoading(false)
  }

  const applyFilters = () => {
    let filtered = [...allEvents]

    // 1. Natural Language / Text Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(e => 
        (e.title + ' ' + (e.description || '') + ' ' + e.venue_name + ' ' + (e.address || '') + ' ' + e.category + ' ' + (e.ai_mood || '')).toLowerCase().includes(q)
      )
    }

    // 2. 11 Core Discovery Modes
    if (discoveryMode === 'tonight') {
      const today = new Date().toDateString()
      filtered = filtered.filter(e => new Date(e.start_time).toDateString() === today)
    } else if (discoveryMode === 'afterwork') {
      // 18:00 - 23:00 strict after-work window
      const today = new Date().toDateString()
      filtered = filtered.filter(e => {
        const d = new Date(e.start_time)
        const hour = d.getHours()
        return d.toDateString() === today && hour >= 18 && hour <= 23
      })
    } else if (discoveryMode === 'tomorrow') {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      filtered = filtered.filter(e => new Date(e.start_time).toDateString() === tomorrow.toDateString())
    } else if (discoveryMode === 'weekend') {
      const now = new Date();
      const dayOfWeek = now.getDay();
      let saturday: Date, sunday: Date;
      if (dayOfWeek === 6) {
        saturday = new Date(now);
        sunday = new Date(now); sunday.setDate(now.getDate() + 1);
      } else if (dayOfWeek === 0) {
        saturday = new Date(now); saturday.setDate(now.getDate() - 1);
        sunday = new Date(now);
      } else {
        const daysUntilSaturday = 6 - dayOfWeek;
        saturday = new Date(now); saturday.setDate(now.getDate() + daysUntilSaturday);
        sunday = new Date(saturday); sunday.setDate(saturday.getDate() + 1);
      }
      filtered = filtered.filter(e => {
        const dStr = new Date(e.start_time).toDateString()
        return dStr === saturday.toDateString() || dStr === sunday.toDateString()
      })
    } else if (discoveryMode === 'nearme' && userCoords) {
      filtered = filtered.filter(e => {
        const dist = getDistanceFromLatLonInKm(userCoords.lat, userCoords.lng, e.lat, e.lng)
        return dist <= 15
      })
    } else if (discoveryMode === 'date') {
      filtered = filtered.filter(e => 
        (e.ai_mood && e.ai_mood.includes('Date')) || ['Müzik', 'Tiyatro', 'Sinema', 'Sanat'].includes(e.category)
      )
    } else if (discoveryMode === 'friends') {
      filtered = filtered.filter(e => 
        (e.ai_mood && e.ai_mood.includes('Kopmalık')) || ['Müzik', 'Stand-Up', 'Festival', 'Parti'].includes(e.category)
      )
    } else if (discoveryMode === 'solo') {
      filtered = filtered.filter(e => 
        (e.ai_mood && e.ai_mood.includes('Sanat')) || ['Sanat', 'Workshop', 'Sinema', 'Eğitim'].includes(e.category)
      )
    } else if (discoveryMode === 'family') {
      filtered = filtered.filter(e => 
        (e.ai_mood && e.ai_mood.includes('Aile')) || ['Aile', 'Çocuk', 'Sinema', 'Workshop'].includes(e.category)
      )
    } else if (discoveryMode === 'free') {
      filtered = filtered.filter(e => e.price?.toLowerCase().includes('ücretsiz') || e.price === '0' || e.min_price === 0)
    }

    // 3. Category Filter
    if (activeCategory !== 'Tümü') filtered = filtered.filter(e => e.category === activeCategory)

    // 4. Mood Filter
    if (activeMood !== 'Tümü') {
      filtered = filtered.filter(e => {
        if (e.ai_mood) return e.ai_mood === activeMood
        const keywords = MOODS[activeMood as keyof typeof MOODS] || []
        const text = (e.title + ' ' + (e.description || '') + ' ' + e.category).toLowerCase()
        return keywords.some(k => text.includes(k.toLowerCase()))
      })
    }

    // 5. Price Filter
    if (priceFilter === 'free') filtered = filtered.filter(e => e.price?.toLowerCase().includes('ücretsiz') || e.price === '0' || e.price === '')

    // Min Price Range Filter
    filtered = filtered.filter(e => {
      if (e.min_price !== null && e.min_price !== undefined) {
        return e.min_price <= priceRange[1];
      }
      return true;
    });

    // 6. City Filter (50km radius)
    if (cityFilter) {
      filtered = filtered.filter(e => {
        const dist = getDistanceFromLatLonInKm(cityFilter.lat, cityFilter.lng, e.lat, e.lng)
        return dist < 50
      })
    }

    // 7. Time Filter (Legacy fallback buttons)
    if (timeFilter !== 'all' && discoveryMode === 'all') {
      const today = new Date();
      const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

      filtered = filtered.filter(e => {
        const eventDate = new Date(e.start_time);
        if (timeFilter === 'today') return eventDate.toDateString() === today.toDateString();
        if (timeFilter === 'tomorrow') return eventDate.toDateString() === tomorrow.toDateString();
        return true;
      });
    }

    // 8. Recommendation & Personalization Engine Ranking
    const userSignals = {
      preferences: userPrefs,
      favoriteEventIds: favorites,
      userLat: userCoords?.lat,
      userLng: userCoords?.lng,
      maxBudget: priceRange[1],
      activeMood: activeMood !== 'Tümü' ? activeMood : undefined
    }

    const scored = rankEvents(filtered, userSignals)

    // Secondary Sort override if explicitly requested
    if (sortBy === 'date-asc') {
      scored.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    } else if (sortBy === 'date-desc') {
      scored.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
    } else if (sortBy === 'popular') {
      scored.sort((a, b) => (favCounts[b.id] || 0) - (favCounts[a.id] || 0))
    }

    setEvents(scored)
  }

  // AI Night Planner Trigger
  const handleOpenNightPlanner = () => {
    const plans = generateNightPlans(allEvents, {
      city: currentLocName,
      budget: priceRange[1] || 1500,
      partyType: plannerInput.partyType,
      mood: activeMood !== 'Tümü' ? activeMood : undefined
    })
    setNightPlans(plans)
    setShowNightPlannerModal(true)
  }

  // Surprise Me Trigger
  const handleSurpriseMe = () => {
    if (events.length === 0) return
    const randomIndex = Math.floor(Math.random() * Math.min(events.length, 5))
    const chosen = events[randomIndex]
    setSurpriseEvent(chosen)
    setShowSurpriseModal(true)
  }

  // NLP Search Handler
  const handleNlpSearch = (rawPrompt: string) => {
    setSearchQuery(rawPrompt)
    const parsed = parseNaturalLanguageQuery(rawPrompt)
    if (parsed.city) {
      const matchedLoc = PRESET_LOCATIONS.find(l => l.name.toLowerCase().includes(parsed.city!.toLowerCase()))
      if (matchedLoc) handleSelectLocation(matchedLoc)
    }
    if (parsed.mood) setActiveMood(parsed.mood)
    if (parsed.timeFilter) {
      if (parsed.timeFilter === 'today') setDiscoveryMode('tonight')
      else setDiscoveryMode(parsed.timeFilter as any)
    }
    if (parsed.freeOnly) setPriceFilter('free')
    if (parsed.maxBudget) setPriceRange([0, parsed.maxBudget])
  }

  // Recovery Action Handlers for Empty State
  const resetAllFilters = () => {
    setDiscoveryMode('all')
    setActiveCategory('Tümü')
    setActiveMood('Tümü')
    setTimeFilter('all')
    setPriceFilter('all')
    setPriceRange([0, 5000])
    setCityFilter(null)
    setSearchQuery('')
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
    if (event.maps_url) {
      window.open(event.maps_url, '_blank')
    } else if (event.lat && event.lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${event.lat},${event.lng}`, '_blank')
    } else if (event.address) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`, '_blank')
    } else {
      alert('Konum bilgisi bulunamadı.')
    }
  }

  const openTicket = (e: any, url: string) => { e?.stopPropagation(); window.open(url, '_blank') }

  // Fetch reviews for selected event
  const fetchEventReviews = async (eventId: number) => {
    const { data } = await supabase
      .from('event_reviews')
      .select('*, profiles:user_id(id)')
      .eq('event_id', eventId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(10)
    if (data) setEventReviews(data)
  }

  // Submit a review
  const handleSubmitReview = async () => {
    if (!user) return alert('Yorum yapmak için giriş yapmalısınız!')
    if (!selectedEvent) return
    if (reviewForm.comment.trim().length < 10) return alert('Yorumunuz en az 10 karakter olmalı.')

    setSubmittingReview(true)
    const { error } = await supabase.from('event_reviews').insert({
      event_id: selectedEvent.id,
      user_id: user.id,
      rating: reviewForm.rating,
      comment: reviewForm.comment.trim(),
      status: 'pending' // Moderasyon bekliyor
    })

    if (error) {
      if (error.code === '23505') {
        alert('Bu etkinliğe zaten yorum yapmışsınız.')
      } else {
        alert('Hata: ' + error.message)
      }
    } else {
      alert('✅ Yorumunuz gönderildi! Onaylandıktan sonra görünecek.')
      setShowReviewForm(false)
      setReviewForm({ rating: 5, comment: '' })
    }
    setSubmittingReview(false)
  }

  // When selected event changes, fetch its reviews
  const onEventSelect = (event: any) => {
    setSelectedEvent(event)
    if (event) {
      fetchEventReviews(event.id)
      setShowReviewForm(false)
      setReviewForm({ rating: 5, comment: '' })
    }
  }

  // Submit event suggestion
  const handleSuggestSubmit = async (e: any) => {
    e.preventDefault();
    if (!suggestForm.title) return alert('Etkinlik adı gerekli!');
    const { error } = await supabase.from('event_suggestions').insert([suggestForm]);
    if (!error) {
      alert('✅ Öneriniz alındı! Geri bildiriminiz için teşekkürler.');
      setShowSuggestModal(false);
      setSuggestForm({ title: '', event_url: '', notes: '', contact_email: '' });
    }
    else { alert('Hata oluştu: ' + error.message); }
  }

  const handleLocate = () => { setTriggerLocate(true); setCurrentLocName("Konumum"); setTimeout(() => setTriggerLocate(false), 1000) }
  const handleSelectLocation = (loc: any) => {
    setManualLocation(loc);
    setCurrentLocName(loc.name.replace('• ', ''));
    setShowLocModal(false);

    // Eğer zoom seviyesi küçükse (Şehir geneli) o şehri filtre olarak ayarla
    if (loc.zoom <= 12) {
      setCityFilter({ lat: loc.lat, lng: loc.lng })
    } else {
      // Bir semt seçildiyse de o şehrin filtresini koruyabiliriz veya kaldırabiliriz. 
      // Şimdilik Ankara semtleri için Ankara merkezini baz alalım.
      if (loc.name.includes('Ankara') || loc.name.includes('Çankaya') || loc.name.includes('Bahçelievler') || loc.name.includes('Kızılay') || loc.name.includes('Ümitköy')) {
        // Ankara Coordinates
        setCityFilter({ lat: 39.9208, lng: 32.8541 })
      } else {
        setCityFilter(null)
      }
    }
  }

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

      {/* SUGGEST EVENT MODAL */}
      {showSuggestModal && (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b dark:border-gray-700 bg-brand text-white text-center relative">
              <h3 className="font-black text-xl tracking-tight">ETKİNLİK ÖNER</h3>
              <p className="text-xs opacity-90">Kaçırdığımız bir etkinlik mi var?</p>
              <button onClick={() => setShowSuggestModal(false)} className="absolute top-4 right-4 text-white/80 hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSuggestSubmit} className="space-y-3">
                <input required placeholder="Etkinlik Adı *" className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600" value={suggestForm.title} onChange={e => setSuggestForm({ ...suggestForm, title: e.target.value })} />
                <input placeholder="Etkinlik Linki (bilet sitesi vb.)" className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600" value={suggestForm.event_url} onChange={e => setSuggestForm({ ...suggestForm, event_url: e.target.value })} />
                <textarea placeholder="Notlar (tarih, mekan vb.)" className="w-full border p-3 rounded-lg h-20 resize-none dark:bg-gray-700 dark:border-gray-600" value={suggestForm.notes} onChange={e => setSuggestForm({ ...suggestForm, notes: e.target.value })} />
                <input placeholder="E-mail (opsiyonel)" className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600" value={suggestForm.contact_email} onChange={e => setSuggestForm({ ...suggestForm, contact_email: e.target.value })} />
                <button className="w-full bg-black text-white dark:bg-white dark:text-black py-3 rounded-xl font-bold">Etkinlik Öner</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* VENUE EVENTS MODAL */}
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
                <div key={e.id} onClick={() => { onEventSelect(e); setShowVenueEventsModal(null); }} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 flex gap-3 cursor-pointer hover:border-brand/50 transition">
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

      {/* AI NIGHT PLANNER MODAL */}
      {showNightPlannerModal && (
        <div className="fixed inset-0 z-[2300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col border border-gray-200 dark:border-gray-800">
            <div className="p-5 border-b dark:border-gray-800 bg-gradient-to-r from-red-950 via-gray-900 to-black text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-brand/30 rounded-xl text-brand-light"><Moon size={22} /></div>
                <div>
                  <h3 className="font-black text-lg tracking-tight">BU AKŞAMI PLANLA (NIGHT PLANNER)</h3>
                  <p className="text-xs text-gray-400">Yemekten etkinliğe ve gece kapanışına kadar eksiksiz rota</p>
                </div>
              </div>
              <button onClick={() => setShowNightPlannerModal(false)} className="p-2 text-gray-400 hover:text-white"><X size={22} /></button>
            </div>

            {/* Planner Inputs Bar */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/60 border-b dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-gray-600 dark:text-gray-300">
                <span>Kiminle:</span>
                <div className="flex bg-white dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                  {(['date', 'friends', 'solo', 'family'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        setPlannerInput(prev => ({ ...prev, partyType: type }));
                        setNightPlans(generateNightPlans(allEvents, { ...plannerInput, partyType: type }));
                      }}
                      className={`px-2.5 py-1 rounded-md capitalize font-bold transition ${plannerInput.partyType === type ? 'bg-brand text-white' : 'text-gray-500'}`}
                    >
                      {type === 'date' ? 'Date 🍷' : type === 'friends' ? 'Arkadaşlar 🍻' : type === 'solo' ? 'Yalnız 🎒' : 'Ailece 👨‍👩‍👧'}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setNightPlans(generateNightPlans(allEvents, plannerInput))}
                className="bg-brand text-white font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-brand-dark transition flex items-center gap-1 shadow-sm"
              >
                <Shuffle size={13} /> Farklı Plan Üret
              </button>
            </div>

            {/* Generated Itineraries */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white dark:bg-gray-900">
              {nightPlans.map((plan) => (
                <div key={plan.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/80 p-5 shadow-sm space-y-4">
                  <div className="flex flex-wrap justify-between items-start gap-2 border-b dark:border-gray-700/80 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-brand tracking-wider bg-brand/10 px-2 py-0.5 rounded-full">{plan.mood}</span>
                      <h4 className="font-black text-lg text-gray-900 dark:text-white mt-1 leading-snug">{plan.planTitle}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{plan.tagline}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-brand">{plan.totalEstimatedCost}</div>
                      <div className="text-[11px] text-gray-400">⏱️ Toplam ~{plan.totalDurationHours} Saat</div>
                    </div>
                  </div>

                  {/* Steps Timeline */}
                  <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-700">
                    {plan.steps.map((step, sIdx) => (
                      <div key={sIdx} className="relative pl-8 flex flex-col gap-1">
                        <div className={`absolute left-1.5 top-1 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-900 ${step.isMainEvent ? 'bg-brand ring-4 ring-brand/20' : 'bg-gray-400 dark:bg-gray-600'}`} />
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-black text-brand">{step.time}</span>
                          <span className="text-[11px] font-bold text-gray-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-700">{step.estimatedCost}</span>
                        </div>
                        <div className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                          {step.isMainEvent ? '🎟️' : step.type === 'dinner' ? '🍽️' : step.type === 'coffee' ? '☕' : '🍸'} {step.title}
                        </div>
                        <div className="text-xs text-gray-500 font-medium">📍 {step.placeName}</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">{step.description}</p>
                        {step.isMainEvent && step.eventRef && (
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => {
                                setShowNightPlannerModal(false);
                                onEventSelect(step.eventRef);
                              }}
                              className="text-xs bg-brand text-white font-bold px-3 py-1.5 rounded-lg hover:bg-brand-dark transition"
                            >
                              Etkinlik Detaylarını Gör
                            </button>
                            {step.eventRef.ticket_url && (
                              <a
                                href={step.eventRef.ticket_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold px-3 py-1.5 rounded-lg hover:bg-gray-200 transition"
                              >
                                Doğrudan Bilet Al
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SURPRISE ME MODAL */}
      {showSurpriseModal && surpriseEvent && (
        <div className="fixed inset-0 z-[2300] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 text-center relative flex flex-col max-h-[85vh]">
            <button onClick={() => setShowSurpriseModal(false)} className="absolute top-4 right-4 z-20 bg-black/60 hover:bg-black text-white p-2 rounded-full transition"><X size={20} /></button>

            <div className="relative h-56 bg-brand overflow-hidden shrink-0">
              {surpriseEvent.image_url ? (
                <img src={surpriseEvent.image_url} alt={surpriseEvent.title} className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full text-white font-black text-3xl">18-23 SÜRPRİZİ</div>
              )}
              <div className="absolute top-3 left-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                🎲 BU AKŞAMIN SEÇİMİ
              </div>
              <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center text-xs font-black text-white bg-black/60 backdrop-blur px-3 py-1.5 rounded-xl">
                <span>{surpriseEvent.category} • {surpriseEvent.ai_mood || 'Özel Seçim'}</span>
                <span className="text-amber-300">🎯 %{surpriseEvent.matchScore} Uyumlu</span>
              </div>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto text-left">
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight">{surpriseEvent.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">📍 {surpriseEvent.venue_name}</p>
                <p className="text-xs text-brand font-bold mt-1">🕒 {formatDateRange(surpriseEvent.start_time, surpriseEvent.end_time)}</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                ✨ {surpriseEvent.summary || surpriseEvent.description || 'Akşamını renklendirecek heyecan dolu bir etkinlik!'}
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-black text-brand bg-brand/10 px-3 py-1 rounded-lg">{formatPrice(surpriseEvent.price)}</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleSurpriseMe}
                    className="px-3 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-200 transition flex items-center gap-1"
                  >
                    <Shuffle size={14} /> Başka Seç
                  </button>
                  <button
                    onClick={() => {
                      setShowSurpriseModal(false);
                      onEventSelect(surpriseEvent);
                    }}
                    className="px-4 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-black shadow-lg transition"
                  >
                    İncele & Katıl →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 z-[1] bg-black/60" onClick={() => setSelectedEvent(null)}></div>
          <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-900 w-full md:w-[500px] md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative z-[2]">
            <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 z-[3] bg-black/50 hover:bg-black text-white p-2 rounded-full transition"><X size={24} /></button>

            <div className="h-64 md:h-72 bg-brand relative shrink-0 flex items-center justify-center overflow-hidden">
              {selectedEvent.image_url ? (
                <img src={selectedEvent.image_url} className={`w-full h-full object-cover ${selectedEvent.sold_out ? 'grayscale' : ''}`} />
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full p-8 gap-4 bg-brand">
                  <div className="text-white font-black text-5xl tracking-tighter opacity-50">18-23</div>
                  <div className="w-full h-[1px] bg-white/20"></div>
                  <div className="flex items-center gap-3 text-white w-full">
                    <div className="bg-white/10 p-2 rounded-lg text-white"><MapPin size={20} /></div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-white/60 uppercase flex items-center gap-2">
                        Mekan
                        <button onClick={(e) => { e.stopPropagation(); toggleFollow(selectedEvent.venue_name); }} className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition flex items-center gap-1 ${followedVenues.includes(selectedEvent.venue_name) ? 'bg-white text-brand' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                          {followedVenues.includes(selectedEvent.venue_name) ? <Check size={10} /> : <Plus size={10} />}
                          {followedVenues.includes(selectedEvent.venue_name) ? 'Takip Ediliyor' : 'Takip Et'}
                        </button>
                      </div>
                      <div className="font-bold text-lg text-white leading-tight">{selectedEvent.venue_name}</div>
                      {selectedEvent.address && <div className="text-xs text-white/80 mt-1 leading-tight">{selectedEvent.address}</div>}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setShowVenueEventsModal(selectedEvent.venue_name); }} className="text-xs bg-white/10 text-white px-2 py-1 rounded font-bold hover:bg-white/20">Diğer Etkinlikler</button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h2 className="font-black text-2xl text-gray-900 dark:text-white leading-tight">{selectedEvent.title}</h2>
                  <span className="text-sm font-bold text-brand bg-brand/10 px-2 py-1 rounded shrink-0 ml-2">{formatPrice(selectedEvent.price)}</span>
                </div>
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <Calendar size={14} /> {formatDateRange(selectedEvent.start_time, selectedEvent.end_time)}
                </div>
              </div>

              {/* PERSONALIZED MATCH & DISTANCE INSIGHT */}
              {selectedEvent.matchScore && (
                <div className="bg-gradient-to-r from-red-950/40 to-purple-950/30 border border-brand/40 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black text-brand flex items-center gap-1.5">
                      <Sparkles size={15} /> 🎯 %{selectedEvent.matchScore} Seninle Uyumlu
                    </span>
                    {selectedEvent.walkMinutes && (
                      <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                        <Footprints size={13} className="text-emerald-400" /> ~{selectedEvent.walkMinutes} dk yürüme
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-300 font-medium leading-relaxed">
                    {selectedEvent.matchReason}
                  </p>
                </div>
              )}

              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Etkinlik Hakkında</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">{selectedEvent.description || 'Açıklama bulunmuyor.'}</p>
              </div>

              {/* MULTI-TICKET PROVIDER COMPARISON */}
              {selectedEvent.ticket_sources && selectedEvent.ticket_sources.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800/80 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2.5 flex items-center gap-1.5">
                    <Ticket size={14} className="text-brand" /> Bilet Sağlayıcıları ({selectedEvent.ticket_sources.length} Platform)
                  </h3>
                  <div className="space-y-2">
                    {selectedEvent.ticket_sources.map((src: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-2.5 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 text-xs">
                        <span className="font-bold text-gray-800 dark:text-gray-200 capitalize">{src.source}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-brand">{src.price}</span>
                          <a href={src.url} target="_blank" rel="noopener noreferrer" className="bg-brand text-white px-2.5 py-1 rounded font-bold hover:bg-brand-dark transition text-[11px]">
                            Seç
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedEvent.rules && (
                <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl border border-yellow-100 dark:border-yellow-900/20">
                  <h3 className="font-bold text-yellow-800 dark:text-yellow-500 mb-2 flex items-center gap-2"><Info size={16} /> Good to Know / Kurallar</h3>
                  <p className="text-sm text-yellow-900 dark:text-yellow-200/80 whitespace-pre-line">{selectedEvent.rules}</p>
                </div>
              )}

              {selectedEvent.ticket_details && selectedEvent.ticket_details.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2"><Ticket size={16} /> Bilet Seçenekleri</h3>
                  <div className="space-y-2">
                    {selectedEvent.ticket_details.map((t: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-brand">{formatPrice(t.price)}</span>
                          {t.status && <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 rounded">{t.status}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t dark:border-gray-700">
                <div className="text-xs font-bold text-gray-400 mb-2 uppercase flex items-center gap-1"><Share2 size={12} /> Paylaş</div>
                <div className="flex gap-2">
                  <button onClick={() => handleShare(selectedEvent, 'whatsapp')} className="p-2 bg-[#25D366]/10 text-[#25D366] rounded-lg hover:bg-[#25D366]/20 transition"><MessageCircle size={20} /></button>
                  <button onClick={() => handleShare(selectedEvent, 'instagram')} className="p-2 bg-[#E1306C]/10 text-[#E1306C] rounded-lg hover:bg-[#E1306C]/20 transition"><Instagram size={20} /></button>
                  <button onClick={() => handleShare(selectedEvent, 'twitter')} className="p-2 bg-[#1DA1F2]/10 text-[#1DA1F2] rounded-lg hover:bg-[#1DA1F2]/20 transition"><Twitter size={20} /></button>
                  <button onClick={() => handleShare(selectedEvent)} className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg"><Share2 size={20} /></button>
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-gray-400 mb-2 uppercase flex items-center gap-1"><CalendarPlus size={12} /> Takvime Ekle</div>
                <div className="flex gap-2">
                  <button onClick={() => addToCalendar(selectedEvent, 'google')} className="flex items-center gap-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-blue-100 transition">Google Calendar</button>
                  <button onClick={() => addToCalendar(selectedEvent, 'ical')} className="flex items-center gap-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-gray-200 transition">Apple / iCaL (.ics)</button>
                </div>
              </div>

              {/* USER REVIEWS SECTION */}
              <div className="pt-4 border-t dark:border-gray-700">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                    <Star size={12} /> Kullanıcı Yorumları ({eventReviews.length})
                  </div>
                  {user && (
                    <button
                      onClick={() => setShowReviewForm(!showReviewForm)}
                      className="text-xs font-bold text-brand hover:text-brand-dark flex items-center gap-1"
                    >
                      {showReviewForm ? 'İptal' : '+ Yorum Yap'}
                    </button>
                  )}
                </div>

                {/* Review Form */}
                {showReviewForm && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl mb-4 space-y-3">
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-1 block">Puanınız</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                            className="p-1 transition-transform hover:scale-110"
                          >
                            <Star
                              size={24}
                              className={star <= reviewForm.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-1 block">Yorumunuz</label>
                      <textarea
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                        placeholder="Bu etkinlik hakkında düşüncelerinizi paylaşın..."
                        className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm resize-none h-24 dark:bg-gray-900 focus:ring-2 focus:ring-brand outline-none"
                        maxLength={500}
                      />
                      <div className="text-[10px] text-gray-400 text-right">{reviewForm.comment.length}/500</div>
                    </div>
                    <button
                      onClick={handleSubmitReview}
                      disabled={submittingReview}
                      className="w-full bg-brand text-white py-2 rounded-lg font-bold text-sm hover:bg-brand-dark transition disabled:opacity-50"
                    >
                      {submittingReview ? 'Gönderiliyor...' : 'Yorumu Gönder'}
                    </button>
                  </div>
                )}

                {/* Reviews List */}
                {eventReviews.length > 0 ? (
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {eventReviews.map((review: any) => (
                      <div key={review.id} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={12}
                                className={star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] text-gray-400">
                            {new Date(review.created_at).toLocaleDateString('tr-TR')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-gray-400">
                    Henüz yorum yapılmamış. {user ? 'İlk yorumu sen yap!' : 'Yorum yapmak için giriş yap.'}
                  </div>
                )}
              </div>

              {/* DISCLAIMER */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mt-2">
                <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                  <strong>⚠️ Uyarı:</strong> 18-23, etkinlik organizatörü değildir. Detaylı bilgi ve güncel fiyatlar için lütfen bilet satış sayfasını ziyaret ediniz.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center gap-3 shrink-0 pb-8 md:pb-4">
              <button onClick={(e) => toggleFavorite(e, selectedEvent.id, selectedEvent.category)} className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition"><Heart size={24} className={favorites.includes(selectedEvent.id) ? "fill-brand text-brand" : ""} /></button>
              {selectedEvent.sold_out ? (
                <div className="flex-1 bg-gray-300 dark:bg-gray-700 text-gray-500 font-bold py-3 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"><Ban size={20} /> TÜKENDİ</div>
              ) : (
                <button onClick={(e) => openTicket(e, selectedEvent.ticket_url)} className="flex-1 bg-brand hover:bg-brand-dark text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition transform active:scale-95"><Ticket size={20} />{selectedEvent.price?.toLowerCase().includes('ücretsiz') || selectedEvent.price === '0' ? 'ÜCRETSİZ KATIL' : `BİLET AL (${formatPrice(selectedEvent.price)})`}</button>
              )}
              <button onClick={(e) => openDirections(e, selectedEvent)} className="p-3 rounded-xl bg-black dark:bg-white dark:text-black text-white hover:bg-gray-800 transition" title="Yol Tarifi"><Navigation size={24} /></button>
            </div>
          </div>
        </div>
      )}

      <header className="h-[70px] bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 flex justify-between items-center z-50 shrink-0 shadow-sm">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-brand text-white font-black text-xl px-3 py-1 tracking-tighter rounded-sm shadow-md">18-23</div>
          </div>
          <button onClick={() => setShowLocModal(true)} className="flex items-center gap-1 text-xs md:text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 px-2.5 py-1.5 rounded-full transition border border-gray-200 dark:border-gray-700">
            <MapPin size={15} className="text-brand" />{currentLocName}<ChevronDown size={13} className="text-gray-400" />
          </button>
        </div>

        {/* Action Buttons in Header */}
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={handleOpenNightPlanner}
            className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-red-950 to-gray-900 text-white font-black text-xs px-3.5 py-2 rounded-xl hover:shadow-md transition border border-brand/40"
          >
            <Moon size={14} className="text-brand-light" /> Gece Planla
          </button>

          <button
            onClick={handleSurpriseMe}
            className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs px-3.5 py-2 rounded-xl hover:shadow-md transition shadow-amber-500/20"
          >
            <Shuffle size={14} /> Beni Şaşırt
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <button className="text-gray-500 hover:text-brand transition relative">
                <Bell size={20} />
                {notifications.length > 0 && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-gray-900"></span>}
              </button>
              <Link href="/profile" className="text-right hidden md:block hover:opacity-70 transition cursor-pointer">
                <div className="text-xs font-bold text-gray-900 dark:text-white">{user.email.split('@')[0]}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 flex justify-end gap-1"><span>{favorites.length} Favori</span></div>
              </Link>
              <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} className="text-gray-400 hover:text-brand transition"><LogOut size={18} /></button>
            </div>
          ) : (
            <Link href="/login" className="text-xs font-bold bg-black dark:bg-white dark:text-black text-white px-3.5 py-2 rounded-lg hover:bg-gray-800 transition">Giriş Yap</Link>
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row overflow-hidden relative">
        {/* MAP SECTION (Hidden on mobile if tab is feed) */}
        <div className={`h-[40%] md:h-full md:w-[58%] bg-gray-100 dark:bg-gray-900 relative order-1 md:order-2 ${mobileTab === 'feed' ? 'hidden md:block' : 'h-full w-full'}`}>
          <MapWithNoSSR 
            events={events} 
            selectedEvent={selectedEvent} 
            triggerLocate={triggerLocate} 
            markerMode="title" 
            manualLocation={manualLocation} 
            onEventSelect={onEventSelect} 
            onVenueClick={(venueName: string) => setShowVenueEventsModal(venueName)}
            onLocationFound={(pos: any) => {
              setUserCoords({ lat: pos.lat, lng: pos.lng });
              setCurrentLocName('Konumum');
            }}
          />
          <button onClick={handleLocate} className="absolute top-4 right-4 z-[1000] bg-white dark:bg-gray-800 p-3 rounded-xl shadow-lg hover:bg-brand hover:text-white transition text-gray-700 dark:text-white border border-gray-200 dark:border-gray-700" title="GPS ile Konumumu Bul"><Navigation size={20} /></button>
          
          <div className="md:hidden absolute top-4 left-4 right-16 z-[900] overflow-x-auto no-scrollbar">
            <div className="flex gap-2">
              {['Tümü', ...CATEGORIES].map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-md whitespace-nowrap backdrop-blur-md ${activeCategory === cat ? 'bg-brand text-white' : 'bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-white'}`}>{cat}</button>
              ))}
            </div>
          </div>
        </div>

        {/* FEED SECTION (Hidden on mobile if tab is map) */}
        <div className={`h-[60%] md:h-full md:w-[42%] bg-white dark:bg-gray-900 order-2 md:order-1 border-r border-gray-200 dark:border-gray-700 flex flex-col shadow-2xl relative z-20 ${mobileTab === 'map' ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0 space-y-3">
            
            {/* Header Title & Counter */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-black tracking-tighter text-gray-900 dark:text-white flex items-center gap-2">
                  AKIŞ <span className="text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand font-bold uppercase">{discoveryMode === 'all' ? 'Tümü' : discoveryMode}</span>
                </h1>
              </div>
              <div className="text-[11px] font-bold text-gray-400 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-full border border-gray-100 dark:border-gray-700">
                {loading ? '...' : `${events.length} Etkinlik`}
              </div>
            </div>

            {/* Smart NLP / Natural Language Search Input */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Örn: Kadıköy'de bu akşam, 400 TL altı konser, date planı..."
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-8 py-2 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Suggested Search Prompts Chips */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
              {[
                { label: 'Kadıköy Caz 🎷', q: 'kadıköy caz konser' },
                { label: 'Tunalı Date 🍷', q: 'tunalı date planı' },
                { label: '500 TL Altı 🎫', q: '500 tl altı etkinlik' },
                { label: 'Ücretsiz Sergi 🎨', q: 'ücretsiz sergi sanat' },
                { label: 'Stand-Up Kahkaha 😂', q: 'stand-up komedi' }
              ].map(chip => (
                <button
                  key={chip.label}
                  onClick={() => handleNlpSearch(chip.q)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-brand/10 hover:text-brand transition shrink-0"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* 11 CORE DISCOVERY MODES */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t dark:border-gray-800">
              {[
                { key: 'all', label: 'Tümü' },
                { key: 'tonight', label: 'Bu Akşam 🔥' },
                { key: 'afterwork', label: 'Mesai Sonrası (18-23) 🌙' },
                { key: 'nearme', label: 'Yakınımda 📍' },
                { key: 'date', label: 'Date Night ❤️' },
                { key: 'friends', label: 'Arkadaşlarla 🍻' },
                { key: 'solo', label: 'Tek Başına 🎒' },
                { key: 'family', label: 'Ailece 👨‍👩‍👧' },
                { key: 'tomorrow', label: 'Yarın' },
                { key: 'weekend', label: 'Hafta Sonu' },
                { key: 'free', label: 'Ücretsiz 🆓' },
              ].map(mode => (
                <button
                  key={mode.key}
                  onClick={() => {
                    setDiscoveryMode(mode.key as any);
                    if (mode.key === 'nearme' && !userCoords) handleLocate();
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 border ${discoveryMode === mode.key ? 'bg-brand text-white border-transparent shadow-md scale-105' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-brand/40'}`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {/* MOOD PILLS */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {Object.keys(MOODS).map(m => (
                <button
                  key={m}
                  onClick={() => { setActiveMood(activeMood === m ? 'Tümü' : m); setActiveCategory('Tümü'); }}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all duration-200 border ${activeMood === m ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-transparent shadow-md' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-purple-300'}`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* CATEGORY PILLS */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveCategory('Tümü')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all duration-200 border ${activeCategory === 'Tümü' ? 'bg-gray-800 text-white dark:bg-white dark:text-black border-transparent' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'}`}
              >
                Tümü
              </button>
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => setActiveCategory(c)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all duration-200 border ${activeCategory === c ? 'bg-gray-800 text-white dark:bg-white dark:text-black border-transparent' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'}`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* PRICE SLIDER */}
            <div className="pt-1 px-1 flex items-center justify-between gap-3 text-xs">
              <span className="text-[10px] uppercase font-bold text-gray-400 whitespace-nowrap">Bütçe: 0 - {priceRange[1] >= 5000 ? '5000+' : priceRange[1]} TL</span>
              <input 
                type="range" 
                min="0" 
                max="5000" 
                step="100" 
                value={priceRange[1]} 
                onChange={(e) => setPriceRange([0, parseInt(e.target.value)])} 
                className="w-full accent-brand h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" 
              />
            </div>
          </div>

          {/* EVENTS FEED LIST */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-black/20 pb-20 md:pb-8">
            {loading && [1, 2, 3].map(i => <SkeletonCard key={i} />)}
            
            {/* ACTIONABLE EMPTY STATE WITH RECOVERY BUTTONS */}
            {!loading && events.length === 0 && (
              <div className="text-center py-12 px-4 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                <div className="w-14 h-14 bg-red-50 dark:bg-red-950/40 text-brand rounded-2xl flex items-center justify-center mx-auto text-2xl">
                  🔍
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">Aradığınız kriterlere uygun etkinlik bulunamadı</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
                    Filtreleri esneterek bu akşam için harika alternatifler bulabilirsiniz:
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 max-w-sm mx-auto pt-2">
                  <button onClick={() => setCityFilter(null)} className="text-xs font-bold px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-200 transition">
                    📍 Tüm Şehri Tara
                  </button>
                  <button onClick={() => setPriceRange([0, 5000])} className="text-xs font-bold px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-200 transition">
                    💰 Bütçe Sınırını Kaldır
                  </button>
                  <button onClick={() => setDiscoveryMode('tomorrow')} className="text-xs font-bold px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-200 transition">
                    📅 Yarın İçin Bak
                  </button>
                  <button onClick={resetAllFilters} className="text-xs font-bold px-3 py-1.5 bg-brand text-white rounded-xl hover:bg-brand-dark transition">
                    🔄 Filtreleri Temizle
                  </button>
                </div>
              </div>
            )}

            {/* EVENT CARDS */}
            {!loading && events.map((event) => {
              const isRecommended = userPrefs.includes(event.category);
              const isFav = favorites.includes(event.id);
              const isSoldOut = event.sold_out;

              return (
                <div 
                  key={event.id} 
                  onClick={() => onEventSelect(event)} 
                  className={`group bg-white dark:bg-gray-800 rounded-3xl cursor-pointer transition-all border border-gray-100 dark:border-gray-700 relative overflow-hidden flex flex-row md:flex-col items-stretch h-36 md:h-auto hover:shadow-xl hover:border-brand/40 outline-none ${event.is_featured ? 'ring-2 ring-yellow-400 shadow-md' : ''}`}
                >
                  {/* Badges */}
                  {event.is_featured && (
                    <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                      ⭐ ÖNE ÇIKAN
                    </div>
                  )}

                  {/* Recommendation Match Badge */}
                  {event.matchScore && (
                    <div className="absolute top-2 right-2 z-10 bg-black/75 backdrop-blur text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow border border-white/20 flex items-center gap-1">
                      <span className="text-amber-400">🎯</span> %{event.matchScore} Uyum
                    </div>
                  )}

                  {/* Image */}
                  {event.image_url && (
                    <div className="w-32 h-full md:w-full md:h-44 bg-brand shrink-0 relative flex items-center justify-center overflow-hidden">
                      <img src={event.image_url} alt={event.title} className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${isSoldOut ? 'grayscale' : ''}`} />
                      {isSoldOut && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-[10px] font-bold text-white bg-red-600 px-1 rounded">TÜKENDİ</span></div>}
                      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase hidden md:block">{event.category}</div>
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-3 md:p-4 flex-1 min-w-0 flex flex-col justify-between space-y-1">
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <span className="text-[10px] font-bold uppercase text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded md:hidden truncate">{event.category}</span>
                        <span className="text-xs font-black text-brand bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded whitespace-nowrap ml-auto">{event.price === '0' || event.price?.toLowerCase().includes('ücretsiz') ? 'Ücretsiz' : formatPrice(event.price)}</span>
                      </div>

                      <h3 className="font-bold text-sm md:text-base text-gray-900 dark:text-white leading-snug line-clamp-2 mt-1 group-hover:text-brand transition-colors">
                        {event.title}
                      </h3>

                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-1 truncate">
                        <MapPin size={12} className="text-brand shrink-0" /> 
                        <span className="truncate">{event.venue_name}</span>
                        {event.walkMinutes && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 rounded shrink-0">
                            🚶 {event.walkMinutes} dk
                          </span>
                        )}
                      </div>

                      {event.summary && (
                        <div className="text-xs text-gray-600 dark:text-gray-300 font-medium mt-1.5 line-clamp-1 leading-relaxed hidden sm:block">
                          ✨ {event.summary}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-end pt-1 border-t border-gray-100 dark:border-gray-800">
                      <div className="text-[11px] text-gray-400 font-medium">{formatDateRange(event.start_time, event.end_time)}</div>
                      <div className="flex items-center gap-1.5">
                        {event.ticket_sources && event.ticket_sources.length > 1 && (
                          <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold">
                            {event.ticket_sources.length} Sağlayıcı
                          </span>
                        )}
                        <button onClick={(e) => toggleFavorite(e, event.id, event.category)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 relative">
                          <Heart size={16} className={isFav ? "fill-brand text-brand" : ""} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Action Bar Footer */}
            <div className="flex flex-wrap justify-center gap-2.5 py-6 border-t dark:border-gray-700 mt-4">
              <button onClick={() => setShowVenueModal(true)} className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs hover:bg-gray-200 transition">
                <Store size={14} /> Mekanını Ekle
              </button>
              <button onClick={() => setShowSuggestModal(true)} className="flex items-center gap-1.5 px-3.5 py-2 bg-brand/10 text-brand rounded-xl font-bold text-xs hover:bg-brand/20 transition">
                <Send size={14} /> Etkinlik Öner
              </button>
              <a href="mailto:iletisim@18-23.com" className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs hover:bg-gray-200 transition">
                <Mail size={14} /> Bize Ulaşın
              </a>
            </div>
            <div className="h-8"></div>
          </div>
        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 flex items-center justify-around z-40 px-2 shadow-2xl">
        <button
          onClick={() => setMobileTab('feed')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-black transition ${mobileTab === 'feed' ? 'text-brand' : 'text-gray-400'}`}
        >
          <Compass size={20} />
          <span>Keşfet</span>
        </button>

        <button
          onClick={() => setMobileTab('map')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-black transition ${mobileTab === 'map' ? 'text-brand' : 'text-gray-400'}`}
        >
          <Map size={20} />
          <span>Harita</span>
        </button>

        <button
          onClick={handleOpenNightPlanner}
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-black text-brand-light transition"
        >
          <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center shadow-lg -mt-3">
            <Moon size={16} />
          </div>
          <span className="text-brand font-black">Planla</span>
        </button>

        <button
          onClick={handleSurpriseMe}
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-black text-amber-500 transition"
        >
          <Shuffle size={20} />
          <span>Sürpriz</span>
        </button>

        <Link
          href={user ? '/profile' : '/login'}
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-black text-gray-400 hover:text-gray-600 transition"
        >
          <User size={20} />
          <span>{user ? 'Profil' : 'Giriş'}</span>
        </Link>
      </nav>
    </div>
  )
}