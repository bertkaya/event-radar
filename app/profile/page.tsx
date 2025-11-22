// app/profile/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { LogOut, MapPin, Calendar, Heart, ArrowLeft, Settings, Star } from 'lucide-react'
import Link from 'next/link'

export default function Profile() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [favorites, setFavorites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    getProfileData()
  }, [])

  const getProfileData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)

    // 1. Profil Bilgileri (Tercihler)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    setProfile(profileData)

    // 2. Favorilenen Etkinlikleri Çek (Join işlemi)
    // Favorites tablosundan event_id'leri alıp, events tablosundan detayları çekiyoruz
    const { data: favData } = await supabase
      .from('favorites')
      .select('event_id, events (*)') // İlişkisel veri çekme
      .eq('user_id', user.id)
    
    if (favData) {
      // Sadece etkinlik verilerini temizle
      const favEvents = favData.map((f: any) => f.events).filter(Boolean)
      setFavorites(favEvents)
    }
    
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // Tercih silme fonksiyonu
  const removePreference = async (pref: string) => {
    const newPrefs = profile.preferences.filter((p: string) => p !== pref)
    setProfile({ ...profile, preferences: newPrefs })
    await supabase.from('profiles').update({ preferences: newPrefs }).eq('id', user.id)
  }

  if (loading) return <div className="h-screen flex items-center justify-center text-brand font-bold">Yükleniyor...</div>

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-10">
      
      {/* Header */}
      <div className="bg-white p-6 shadow-sm sticky top-0 z-10 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-gray-600 font-bold text-sm hover:text-brand">
          <ArrowLeft size={20} /> Geri Dön
        </Link>
        <h1 className="text-lg font-black tracking-tight">PROFİLİM</h1>
        <div className="w-6"></div> {/* Ortalama için boşluk */}
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        
        {/* Kullanıcı Kartı */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-brand text-white rounded-full flex items-center justify-center text-3xl font-black mb-3">
            {user.email[0].toUpperCase()}
          </div>
          <h2 className="text-xl font-bold text-gray-900">{user.email.split('@')[0]}</h2>
          <p className="text-xs text-gray-400 mb-4">{user.email}</p>
          
          <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 text-xs font-bold border border-red-100 px-4 py-2 rounded-full hover:bg-red-50 transition">
            <LogOut size={14} /> Çıkış Yap
          </button>
        </div>

        {/* İlgi Alanları */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2"><Settings size={18}/> İlgi Alanlarım</h3>
            <Link href="/onboarding" className="text-xs text-brand font-bold hover:underline">Düzenle</Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile?.preferences?.map((pref: string) => (
              <span key={pref} className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
                {pref}
                <button onClick={() => removePreference(pref)} className="hover:text-red-500">×</button>
              </span>
            ))}
            {(!profile?.preferences || profile.preferences.length === 0) && (
              <span className="text-xs text-gray-400">Henüz ilgi alanı seçmedin.</span>
            )}
          </div>
        </div>

        {/* Favoriler Listesi */}
        <div>
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 px-2">
            <Heart size={18} className="fill-brand text-brand"/> Favorilerim ({favorites.length})
          </h3>
          
          <div className="space-y-3">
            {favorites.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-sm">
                Henüz favorilediğin bir etkinlik yok. <br/>
                <Link href="/" className="text-brand underline font-bold">Keşfetmeye başla!</Link>
              </div>
            )}

            {favorites.map((event: any) => (
              <div key={event.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4 group">
                {/* Küçük Görsel */}
                <div className="w-20 h-20 bg-gray-200 rounded-xl shrink-0 overflow-hidden">
                  {event.image_url ? (
                    <img src={event.image_url} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-brand font-bold text-[10px] bg-brand/10">18-23</div>
                  )}
                </div>

                {/* Bilgi */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-gray-900 truncate pr-2">{event.title}</h4>
                    <span className="text-[10px] font-bold bg-gray-100 px-2 py-0.5 rounded text-gray-500">{event.category}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <div className="flex items-center gap-1"><Calendar size={12}/> {new Date(event.start_time).toLocaleDateString('tr-TR', {day:'numeric', month:'short'})}</div>
                    <div className="flex items-center gap-1 truncate"><MapPin size={12}/> {event.venue_name}</div>
                  </div>

                  <div className="mt-2 text-xs font-bold text-brand">{event.price}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}