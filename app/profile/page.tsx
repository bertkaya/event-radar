// app/profile/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { LogOut, MapPin, Calendar, Heart, ArrowLeft, Settings, Star, X, Plus, History } from 'lucide-react'
import Link from 'next/link'

export default function Profile() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [favorites, setFavorites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => { getProfileData() }, [])

  const getProfileData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUser(user)

    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(profileData)

    const { data: favData } = await supabase.from('favorites').select('event_id, events (*)').eq('user_id', user.id)
    if (favData) {
      const favEvents = favData.map((f: any) => f.events).filter(Boolean)
      setFavorites(favEvents)
    }
    setLoading(false)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }

  const removePreference = async (pref: string) => {
    if (!profile) return
    const newPrefs = profile.preferences.filter((p: string) => p !== pref)
    setProfile({ ...profile, preferences: newPrefs })
    await supabase.from('profiles').update({ preferences: newPrefs }).eq('id', user.id)
  }

  const removeFavorite = async (eventId: number) => {
    setFavorites(favorites.filter(e => e.id !== eventId))
    await supabase.from('favorites').delete().match({ user_id: user.id, event_id: eventId })
  }

  if (loading) return <div className="h-screen flex items-center justify-center text-brand font-bold animate-pulse bg-white dark:bg-gray-900">Profil Yükleniyor...</div>

  // Tarihe göre ayır
  const now = new Date()
  const upcomingEvents = favorites.filter(e => new Date(e.start_time) >= now)
  const pastEvents = favorites.filter(e => new Date(e.start_time) < now)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans pb-20 text-gray-800 dark:text-gray-100 transition-colors">
      <div className="bg-white dark:bg-gray-800 p-4 md:p-6 shadow-sm sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <Link href="/" className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-bold text-sm hover:text-brand transition"><ArrowLeft size={20} /> <span className="hidden md:inline">Ana Sayfaya Dön</span></Link>
        <h1 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">PROFİLİM</h1>
        <button onClick={handleLogout} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-full transition" title="Çıkış Yap"><LogOut size={20} /></button>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 bg-gradient-to-br from-brand to-red-900 text-white rounded-full flex items-center justify-center text-4xl font-black shadow-lg border-4 border-white dark:border-gray-700">{user.email[0].toUpperCase()}</div>
          <div className="text-center md:text-left flex-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{user.email.split('@')[0]}</h2>
            <p className="text-sm text-gray-400 font-medium mb-4">{user.email}</p>
            <div className="flex gap-3 justify-center md:justify-start">
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-600 flex flex-col items-center md:items-start"><span className="text-[10px] font-bold text-gray-400 uppercase">Favoriler</span><span className="text-xl font-black text-brand">{favorites.length}</span></div>
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-600 flex flex-col items-center md:items-start"><span className="text-[10px] font-bold text-gray-400 uppercase">İlgi Alanı</span><span className="text-xl font-black text-brand">{profile?.preferences?.length || 0}</span></div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><Settings size={18}/> İlgi Alanlarım</h3><Link href="/onboarding" className="flex items-center gap-1 text-xs font-bold bg-black dark:bg-white dark:text-black text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition"><Plus size={12}/> Düzenle / Ekle</Link></div>
          <div className="flex flex-wrap gap-2">
            {profile?.preferences?.map((pref: string) => (<span key={pref} className="group bg-gray-100 dark:bg-gray-700 hover:bg-brand/10 text-gray-700 dark:text-gray-300 hover:text-brand px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition">{pref}<button onClick={() => removePreference(pref)} className="text-gray-400 hover:text-red-500"><X size={14}/></button></span>))}
            {(!profile?.preferences || profile.preferences.length === 0) && <span className="text-sm text-gray-400 italic">Henüz ilgi alanı seçmedin. Yukarıdan ekleyebilirsin.</span>}
          </div>
        </div>

        {/* GELECEK ETKİNLİKLER */}
        <div>
          <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2 px-2 text-lg"><Heart size={20} className="fill-brand text-brand"/> Favorilerim ({upcomingEvents.length})</h3>
          <div className="space-y-3">
            {upcomingEvents.length === 0 && (
              <div className="bg-white dark:bg-gray-800 p-10 rounded-3xl border border-dashed border-gray-300 dark:border-gray-600 text-center"><Star className="mx-auto text-gray-300 mb-2" size={40}/><p className="text-gray-400 text-sm font-medium">Listen henüz boş.</p><Link href="/" className="text-brand text-sm font-bold hover:underline mt-2 block">Keşfetmeye Başla</Link></div>
            )}
            {upcomingEvents.map((event: any) => (
              <div key={event.id} className="group bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex gap-4 hover:shadow-md transition relative overflow-hidden">
                <button onClick={(e) => { e.preventDefault(); removeFavorite(event.id); }} className="absolute top-2 right-2 p-1.5 bg-white dark:bg-gray-700 text-gray-400 hover:text-red-500 rounded-full shadow-sm z-10 opacity-0 group-hover:opacity-100 transition" title="Listeden Çıkar"><X size={16}/></button>
                <div className="w-24 h-24 bg-brand rounded-xl shrink-0 overflow-hidden relative flex items-center justify-center">
                  {event.image_url ? <img src={event.image_url} className="w-full h-full object-cover" /> : <span className="text-white font-black text-lg tracking-tighter opacity-50">18-23</span>}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur py-0.5 text-center"><span className="text-[8px] font-bold text-white uppercase">{event.category}</span></div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h4 className="font-bold text-lg text-gray-900 dark:text-white truncate pr-6">{event.title}</h4>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                    <div className="flex items-center gap-1"><Calendar size={12}/> {new Date(event.start_time).toLocaleDateString('tr-TR', {day:'numeric', month:'short'})}</div>
                    <div className="flex items-center gap-1 truncate"><MapPin size={12}/> {event.venue_name}</div>
                  </div>
                  <div className="mt-3 flex items-center justify-between"><span className="text-xs font-black text-brand bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded">{event.price}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GEÇMİŞ ETKİNLİKLER (Arşiv) */}
        {pastEvents.length > 0 && (
            <div className="pt-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                <h3 className="font-bold text-gray-500 mb-4 flex items-center gap-2 px-2 text-sm uppercase tracking-wider"><History size={16}/> Geçmiş Etkinlikler</h3>
                <div className="space-y-3">
                    {pastEvents.map((event: any) => (
                    <div key={event.id} className="bg-gray-100 dark:bg-gray-800 p-3 rounded-xl flex gap-3 items-center">
                        <div className="w-12 h-12 bg-gray-300 dark:bg-gray-700 rounded-lg shrink-0 overflow-hidden">
                            {event.image_url && <img src={event.image_url} className="w-full h-full object-cover" />}
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-600 dark:text-gray-400 text-sm">{event.title}</h4>
                            <div className="text-[10px] text-gray-400">{new Date(event.start_time).toLocaleDateString('tr-TR')}</div>
                        </div>
                    </div>
                    ))}
                </div>
            </div>
        )}

      </div>
    </div>
  )
}