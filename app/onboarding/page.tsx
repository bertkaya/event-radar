// app/onboarding/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Check, Music, Coffee, Mic, Palette, Trophy, Camera } from 'lucide-react'

const CATEGORIES = [
  { id: 'Müzik', icon: <Music size={24}/>, label: 'Müzik & Konser' },
  { id: 'Tiyatro', icon: <Mic size={24}/>, label: 'Tiyatro & Sahne' },
  { id: 'Sanat', icon: <Palette size={24}/>, label: 'Sanat & Sergi' },
  { id: 'Yeme-İçme', icon: <Coffee size={24}/>, label: 'Gastronomi' },
  { id: 'Spor', icon: <Trophy size={24}/>, label: 'Spor' },
  { id: 'Sinema', icon: <Camera size={24}/>, label: 'Sinema' },
]

export default function Onboarding() {
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true) // Yükleniyor durumu
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  // Sayfa açılınca mevcut tercihleri çek
  useEffect(() => {
    const fetchPreferences = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('preferences')
          .eq('id', user.id)
          .single()
        
        if (profile && profile.preferences) {
          setSelected(profile.preferences)
        }
      }
      setLoading(false)
    }
    fetchPreferences()
  }, [])

  const toggleCat = (id: string) => {
    if (selected.includes(id)) setSelected(selected.filter(item => item !== id))
    else setSelected([...selected, id])
  }

  const savePreferences = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ preferences: selected })
        .eq('id', user.id)

      if (!error) router.push('/')
      else alert('Hata: ' + error.message)
    }
    setSaving(false)
  }

  if (loading) return <div className="h-screen flex items-center justify-center text-brand font-bold">Yükleniyor...</div>

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-4xl font-black text-brand mb-2 tracking-tighter">İLGİ ALANLARIN?</h1>
        <p className="text-gray-500 text-lg font-medium mb-10">
          Tercihlerini düzenle, sana en uygun<br/>etkinlikleri gösterelim.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => toggleCat(cat.id)}
              className={`relative p-6 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center gap-3 ${
                selected.includes(cat.id)
                  ? 'border-brand bg-brand text-white shadow-xl scale-105'
                  : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-brand/30'
              }`}
            >
              {selected.includes(cat.id) && (
                <div className="absolute top-2 right-2 bg-white text-brand rounded-full p-1">
                  <Check size={10} strokeWidth={4} />
                </div>
              )}
              <div className={selected.includes(cat.id) ? 'text-white' : 'text-brand'}>{cat.icon}</div>
              <span className="font-bold text-sm">{cat.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={savePreferences}
          disabled={selected.length === 0 || saving}
          className={`w-full md:w-1/2 py-4 rounded-xl font-bold text-lg transition-all ${
            selected.length > 0 
              ? 'bg-brand text-white shadow-lg hover:bg-brand-dark' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {saving ? 'Kaydediliyor...' : 'Kaydet ve Devam Et →'}
        </button>
      </div>
    </div>
  )
}