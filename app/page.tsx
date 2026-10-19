// app/page.tsx
'use client'

import { toast } from '@/lib/toast'
import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import {
  MapPin, Navigation, LogOut, Map, X, ChevronDown, Send, Store, Mail,
  User, Bell, Compass, Shuffle, Moon, Search
} from 'lucide-react'
import Link from 'next/link'
import SkeletonCard from '@/components/Skeleton'
import SubmissionModals from '@/components/home/SubmissionModals'
import NightPlannerModal from '@/components/home/NightPlannerModal'
import SurpriseModal from '@/components/home/SurpriseModal'
import EventDetailModal from '@/components/home/EventDetailModal'
import EventCard from '@/components/home/EventCard'
import type { Event, SelectableEvent, MapLocation, AppNotification, Review, MaybeEvent } from '@/lib/types'
import type { User as AuthUser } from '@supabase/supabase-js'
import { fakeEvents } from '@/lib/data'
import { getDistanceFromLatLonInKm } from '@/lib/utils'
import { deduplicateEvents } from '@/lib/dedup'
import { rankEvents, ScoredEvent } from '@/lib/recommendation'
import { generateNightPlans, NightPlan } from '@/lib/night_planner'
import { parseNaturalLanguageQuery } from '@/lib/nlp_filter'
import { eventUrl } from '@/lib/site'
import { DEMO_MODE, PRESET_LOCATIONS, DEFAULT_LOCATION, LOCATION_STORAGE_KEY, KIND_FILTERS, hasCoords, CATEGORIES, MOODS, formatDateRange } from '@/lib/home'

const MapWithNoSSR = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-brand font-bold">Harita Yükleniyor...</div>
})

export default function Home() {
  const [events, setEvents] = useState<ScoredEvent[]>([])
  const [allEvents, setAllEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true) // Yükleniyor durumu
  const [userPrefs, setUserPrefs] = useState<string[]>([])
  const [favorites, setFavorites] = useState<number[]>([])
  const [favCounts, setFavCounts] = useState<{ [key: number]: number }>({})
  const [selectedEvent, setSelectedEvent] = useState<SelectableEvent | null>(null)

  // 11 Core Product Modes
  const [discoveryMode, setDiscoveryMode] = useState<
    'all' | 'tonight' | 'afterwork' | 'tomorrow' | 'weekend' | 'nearme' | 'date' | 'friends' | 'solo' | 'family' | 'free'
  >('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false) // mobilde ayrıntılı filtreler çekmecede
  const autoNearDone = useRef(false)
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
  const [sortBy] = useState<'date-asc' | 'date-desc' | 'popular' | 'match'>('match')
  const [priceFilter, setPriceFilter] = useState<'all' | 'free'>('all')
  const [priceRange, setPriceRange] = useState<number[]>([0, 5000]) // [min, max]
  const [cityFilter, setCityFilter] = useState<{ lat: number, lng: number, city: string | null } | null>(null) // City Filter
  const [kindFilter, setKindFilter] = useState<typeof KIND_FILTERS[number]['key']>('all')

  const [triggerLocate, setTriggerLocate] = useState(false)
  const [manualLocation, setManualLocation] = useState<MapLocation | null>(null)
  const [showLocModal, setShowLocModal] = useState(false)
  const [showVenueModal, setShowVenueModal] = useState(false)
  const [showVenueEventsModal, setShowVenueEventsModal] = useState<string | null>(null) // Venue Name

  const [currentLocName, setCurrentLocName] = useState(DEFAULT_LOCATION.name)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [venueForm, setVenueForm] = useState({ venue_name: '', contact_name: '', phone: '', email: '', message: '' })
  const [showSuggestModal, setShowSuggestModal] = useState(false)
  const [suggestForm, setSuggestForm] = useState({ title: '', event_url: '', notes: '', contact_email: '' })
  const [honeypot, setHoneypot] = useState('')
  const [venueKvkk, setVenueKvkk] = useState(false)
  const [loadError, setLoadError] = useState(false)

  // Phase 3: User Engagement State
  const [followedVenues, setFollowedVenues] = useState<string[]>([])
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  // Phase 5: Reviews State
  const [eventReviews, setEventReviews] = useState<Review[]>([])
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const [submittingReview, setSubmittingReview] = useState(false)

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

  // When selected event changes, fetch its reviews
  const onEventSelect = (event: SelectableEvent | null) => {
    setSelectedEvent(event)
    if (event) {
      fetchEventReviews(event.id)
      setShowReviewForm(false)
      setReviewForm({ rating: 5, comment: '' })
    }
  }

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
      toast('Lütfen giriş yapınız.');
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

  const fetchData = async () => {
    setLoading(true)
    await fetchUserData()

    const { data: favRows } = await supabase.from('event_favorite_counts').select('event_id, favorite_count')
    const counts: { [key: number]: number } = {}
    favRows?.forEach((f: { event_id: number; favorite_count: number }) => { counts[f.event_id] = f.favorite_count })
    setFavCounts(counts)

    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select('*, organizers(name, logo_url)')
      .eq('is_approved', true)
      // Henüz başlamamış ya da hâlâ süren (sergi gibi) etkinlikler; kaynakta kaybolanlar (inactive) hariç
      .or(`start_time.gte.${new Date().toISOString()},end_time.gte.${new Date().toISOString()}`)
      .neq('status', 'inactive')
      .order('start_time', { ascending: true });

    if (eventsError) {
      console.error('Etkinlikler yüklenemedi:', eventsError)
      setLoadError(true)
    }
    const activeList = (eventsData && eventsData.length > 0) ? eventsData : (DEMO_MODE ? fakeEvents : []);
    
    // 1. Intelligent Deduplication across ticket vendors (Biletix, Passo, Bubilet, Biletinial)
    const deduplicated = deduplicateEvents(activeList);

    // Aynı mekândaki işaretler üst üste binmesin diye çok küçük kaydırma; koordinatı olmayanlar olduğu gibi kalır
    const jitteredEvents = deduplicated.map(ev => hasCoords(ev) ? ({
      ...ev,
      lat: ev.lat + (Math.random() - 0.5) * 0.0002,
      lng: ev.lng + (Math.random() - 0.5) * 0.0002
    }) : ev)
    setAllEvents(jitteredEvents)
    setLoading(false)

    // /etkinlik/[id] sayfasından "Haritada Gör" ile gelindiyse o etkinliği aç
    const sharedId = Number(new URLSearchParams(window.location.search).get('event'))
    if (sharedId) {
      const shared = jitteredEvents.find(ev => ev.id === sharedId)
      if (shared) onEventSelect(shared)
    }
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

    // 5b. Katılım şekli
    if (kindFilter !== 'all') {
      filtered = filtered.filter(e => kindFilter === 'free'
        ? e.event_kind === 'free' || e.min_price === 0 || !!e.price?.toLowerCase().includes('ücretsiz')
        : e.event_kind === kindFilter)
    }

    // 6. City Filter: şehir alanı varsa onunla, yoksa (eski kayıtlar) merkezden 50 km
    if (cityFilter) {
      filtered = filtered.filter(e => {
        if (e.city && cityFilter.city) return e.city === cityFilter.city
        if (!hasCoords(e)) return false
        return getDistanceFromLatLonInKm(cityFilter.lat, cityFilter.lng, e.lat, e.lng) < 50
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

  // Veri yükleme ve filtreleme (fonksiyonlar tanımlandıktan sonra)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData() }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { applyFilters() }, [activeCategory, activeMood, timeFilter, discoveryMode, searchQuery, sortBy, priceFilter, kindFilter, allEvents, favCounts, cityFilter, priceRange, userCoords, userPrefs])

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

  const handleLocate = () => { setTriggerLocate(true); setCurrentLocName("Konumum"); setTimeout(() => setTriggerLocate(false), 1000) }
  const handleSelectLocation = (loc: typeof PRESET_LOCATIONS[number]) => {
    setManualLocation(loc);
    setCurrentLocName(loc.name.replace('• ', ''));
    setShowLocModal(false);
    try { localStorage.setItem(LOCATION_STORAGE_KEY, loc.name) } catch { /* depolama kapalı olabilir */ }

    // Semt seçilse de filtre şehrin tamamıdır; harita semte yakınlaşır
    const cityPreset = PRESET_LOCATIONS.find(l => l.city === loc.city && l.zoom <= 12) || loc
    setCityFilter(loc.city ? { lat: cityPreset.lat, lng: cityPreset.lng, city: loc.city } : null)
  }

  // NLP Search Handler
  const handleNlpSearch = (rawPrompt: string) => {
    const parsed = parseNaturalLanguageQuery(rawPrompt)
    // Ham cümle değil, filtreye dönüşmeyen kalan sözcükler metin araması olur; yeni cümle eski filtreleri de sıfırlar
    setSearchQuery(parsed.searchQuery ?? '')
    setActiveCategory(parsed.category ? (parsed.category === 'Workshop' ? 'Eğitim' : parsed.category) : 'Tümü')
    setActiveMood('Tümü')
    setPriceFilter('all')
    setPriceRange([0, 5000])
    setDiscoveryMode('all')
    if (parsed.city) {
      const matchedLoc = PRESET_LOCATIONS.find(l => l.name.toLowerCase().includes(parsed.city!.toLowerCase()))
      if (matchedLoc) handleSelectLocation(matchedLoc)
    }
    if (parsed.mood) setActiveMood(parsed.mood)
    if (parsed.timeFilter) {
      if (parsed.timeFilter === 'today') setDiscoveryMode('tonight')
      else setDiscoveryMode(parsed.timeFilter as typeof discoveryMode)
    }
    if (parsed.freeOnly) setPriceFilter('free')
    if (parsed.maxBudget) setPriceRange([0, parsed.maxBudget])
  }

  // Recovery Action Handlers for Empty State
  const resetAllFilters = () => {
    setKindFilter('all')
    setDiscoveryMode('all')
    setActiveCategory('Tümü')
    setActiveMood('Tümü')
    setTimeFilter('all')
    setPriceFilter('all')
    setPriceRange([0, 5000])
    setCityFilter(null)
    setSearchQuery('')
  }

  const toggleFavorite = async (e: MaybeEvent, eventId: number, category: string) => {
    e?.stopPropagation()
    if (!user) return toast('Favorilere eklemek için giriş yapmalısın!')
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

  // --- SOCIAL SHARE ---
  const handleShare = async (event: Event, platform?: 'whatsapp' | 'twitter' | 'instagram') => {
    const url = eventUrl(event.id)
    const shareText = `🔥 ${event.title} @ ${event.venue_name}\n🗓️ ${formatDateRange(event.start_time, event.end_time)}\n\n${url}`

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank')
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank')
    } else if (platform === 'instagram') {
      toast('Instagram hikaye paylaşımı mobilde kopyalayarak yapılabilir. Metin kopyalandı!')
      navigator.clipboard.writeText(shareText);
    } else {
      // Native or Copy
      if (navigator.share) { try { await navigator.share({ title: event.title, text: shareText, url }) } catch { /* iptal edildi */ } }
      else { navigator.clipboard.writeText(shareText); toast('Link kopyalandı!') }
    }
    await supabase.from('analytics').insert([{ event_id: event.id, category: event.category, action_type: 'share' }])
  }

  // --- CALENDAR ---
  const addToCalendar = (event: Event, type: 'google' | 'ical') => {
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
URL:${event.ticket_url || eventUrl(event.id)}
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

  const handleVenueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'venue_application', ...venueForm, kvkk: venueKvkk, website: honeypot }),
    })
    const json = await res.json().catch(() => ({}))
    if (res.ok) { toast('Başvurunuz alındı!'); setShowVenueModal(false); setVenueForm({ venue_name: '', contact_name: '', phone: '', email: '', message: '' }); setVenueKvkk(false) }
    else { toast(json.error || 'Hata oluştu.') }
  }

  const openDirections = (e: MaybeEvent, event: Event) => {
    e?.stopPropagation()
    if (event.maps_url) {
      window.open(event.maps_url, '_blank')
    } else if (event.lat && event.lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${event.lat},${event.lng}`, '_blank')
    } else if (event.address) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`, '_blank')
    } else {
      toast('Konum bilgisi bulunamadı.')
    }
  }

  const openTicket = (e: MaybeEvent, url?: string) => { e?.stopPropagation(); if (url) window.open(url, '_blank', 'noopener') }

  // Submit a review
  const handleSubmitReview = async () => {
    if (!user) return toast('Yorum yapmak için giriş yapmalısınız!')
    if (!selectedEvent) return
    if (reviewForm.comment.trim().length < 10) return toast('Yorumunuz en az 10 karakter olmalı.')

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
        toast('Bu etkinliğe zaten yorum yapmışsınız.')
      } else {
        toast('Hata: ' + error.message)
      }
    } else {
      toast('✅ Yorumunuz gönderildi! Onaylandıktan sonra görünecek.')
      setShowReviewForm(false)
      setReviewForm({ rating: 5, comment: '' })
    }
    setSubmittingReview(false)
  }

  // Submit event suggestion
  const handleSuggestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestForm.title) return toast('Etkinlik adı gerekli!');
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'event_suggestion', ...suggestForm, website: honeypot }),
    })
    const json = await res.json().catch(() => ({}))
    if (res.ok) {
      toast('✅ Öneriniz alındı! Geri bildiriminiz için teşekkürler.');
      setShowSuggestModal(false);
      setSuggestForm({ title: '', event_url: '', notes: '', contact_email: '' });
    }
    else { toast(json.error || 'Hata oluştu.'); }
  }

  // Son seçilen konumu hatırla (yalnızca bu tarayıcıda)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCATION_STORAGE_KEY)
      const loc = PRESET_LOCATIONS.find(l => l.name === saved)
      if (loc && loc !== DEFAULT_LOCATION) handleSelectLocation(loc)
    } catch { /* depolama kapalı olabilir */ }
  }, [])

  // Konum izni yalnızca kullanıcı 'Yakınımda'ya basınca istenir (sayfa açılışında sormak ürkütücü). İzin gelince mod kendiliğinden 'Yakınımda' olur.
  useEffect(() => {
    if (userCoords && !autoNearDone.current && discoveryMode === 'all') { autoNearDone.current = true; setDiscoveryMode('nearme') }
  }, [userCoords, discoveryMode])

  return (
    <div className="flex flex-col h-screen w-full bg-white dark:bg-gray-900 text-black dark:text-gray-100 font-sans overflow-hidden transition-colors">

      <SubmissionModals
        showLocModal={showLocModal}
        setShowLocModal={setShowLocModal}
        handleSelectLocation={handleSelectLocation}
        handleLocate={handleLocate}
        showVenueModal={showVenueModal}
        setShowVenueModal={setShowVenueModal}
        venueForm={venueForm}
        setVenueForm={setVenueForm}
        venueKvkk={venueKvkk}
        setVenueKvkk={setVenueKvkk}
        handleVenueSubmit={handleVenueSubmit}
        showSuggestModal={showSuggestModal}
        setShowSuggestModal={setShowSuggestModal}
        suggestForm={suggestForm}
        setSuggestForm={setSuggestForm}
        handleSuggestSubmit={handleSuggestSubmit}
        honeypot={honeypot}
        setHoneypot={setHoneypot}
        showVenueEventsModal={showVenueEventsModal}
        setShowVenueEventsModal={setShowVenueEventsModal}
        allEvents={allEvents}
        onEventSelect={onEventSelect}
      />

      <NightPlannerModal
        show={showNightPlannerModal}
        onClose={() => setShowNightPlannerModal(false)}
        allEvents={allEvents}
        plannerInput={plannerInput}
        setPlannerInput={setPlannerInput}
        nightPlans={nightPlans}
        setNightPlans={setNightPlans}
        onEventSelect={onEventSelect}
      />

      <SurpriseModal
        show={showSurpriseModal}
        surpriseEvent={surpriseEvent}
        onClose={() => setShowSurpriseModal(false)}
        onPickAnother={handleSurpriseMe}
        onEventSelect={onEventSelect}
      />

      <EventDetailModal
        selectedEvent={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        followedVenues={followedVenues}
        toggleFollow={toggleFollow}
        setShowVenueEventsModal={setShowVenueEventsModal}
        handleShare={handleShare}
        addToCalendar={addToCalendar}
        user={user}
        eventReviews={eventReviews}
        showReviewForm={showReviewForm}
        setShowReviewForm={setShowReviewForm}
        reviewForm={reviewForm}
        setReviewForm={setReviewForm}
        handleSubmitReview={handleSubmitReview}
        submittingReview={submittingReview}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
        openTicket={openTicket}
        openDirections={openDirections}
      />

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
                <div className="text-xs font-bold text-gray-900 dark:text-white">{user.email?.split('@')[0]}</div>
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
            onLocationFound={(pos) => {
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
                onKeyDown={(e) => { if (e.key === 'Enter' && searchQuery.trim()) handleNlpSearch(searchQuery) }} // cümleyi filtrelere çevir
                placeholder="Örn: Kadıköy'de bu akşam, 400 TL altı konser, date planı..."
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-8 py-2 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Mobil hızlı seçimler: sadece zaman; gerisi "Filtreler" çekmecesinde */}
            <div className="flex items-center gap-1.5 md:hidden">
              {[
                { key: 'tonight', label: 'Bu Akşam 🔥' },
                { key: 'tomorrow', label: 'Yarın' },
                { key: 'weekend', label: 'Hafta Sonu' },
              ].map(mode => (
                <button
                  key={mode.key}
                  onClick={() => setDiscoveryMode(discoveryMode === mode.key ? 'all' : (mode.key as typeof discoveryMode))}
                  aria-pressed={discoveryMode === mode.key}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition ${discoveryMode === mode.key ? 'bg-brand text-white border-brand' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}
                >
                  {mode.label}
                </button>
              ))}
              <button
                onClick={() => setShowFilters(v => !v)}
                aria-expanded={showFilters}
                className="ml-auto px-3 py-1.5 rounded-full text-xs font-bold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800"
              >
                {showFilters ? 'Filtreleri gizle ▲' : 'Filtreler ▼'}
              </button>
            </div>

            <div className={`${showFilters ? 'space-y-3' : 'hidden'} md:block md:space-y-3`}>
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
                    setDiscoveryMode(mode.key as typeof discoveryMode);
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

            {/* KATILIM ŞEKLİ */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar" role="group" aria-label="Katılım şekli">
              {KIND_FILTERS.map(k => (
                <button
                  key={k.key}
                  onClick={() => setKindFilter(k.key)}
                  aria-pressed={kindFilter === k.key}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all duration-200 border ${kindFilter === k.key ? 'bg-brand text-white border-transparent' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'}`}
                >
                  {k.label}
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
          </div>

          {/* EVENTS FEED LIST */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-black/20 pb-20 md:pb-8">
            {loading && [1, 2, 3].map(i => <SkeletonCard key={i} />)}
            
            {!loading && loadError && (
              <div className="text-center py-10 px-4 bg-white dark:bg-gray-800 rounded-3xl border border-red-200 dark:border-red-900 space-y-3">
                <h3 className="font-bold text-gray-900 dark:text-white">Etkinlikler şu an yüklenemedi</h3>
                <p className="text-xs text-gray-500">Bağlantı sorunu olabilir. Birazdan tekrar deneyin.</p>
                <button onClick={() => { setLoadError(false); fetchData() }} className="text-xs font-bold px-3 py-1.5 bg-brand text-white rounded-xl">Tekrar Dene</button>
              </div>
            )}

            {/* ACTIONABLE EMPTY STATE WITH RECOVERY BUTTONS */}
            {!loading && !loadError && events.length === 0 && (
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
            {!loading && events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isFav={favorites.includes(event.id)}
                onEventSelect={onEventSelect}
                toggleFavorite={toggleFavorite}
              />
            ))}

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
            <div className="flex justify-center gap-4 text-[11px] text-gray-400 pb-2">
              <Link href="/kvkk" className="hover:text-brand">KVKK &amp; Gizlilik</Link>
              <span>© {new Date().getFullYear()} 18-23</span>
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