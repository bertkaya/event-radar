'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Calendar, ChevronLeft, MapPin, Clock } from 'lucide-react'

export default function MyCalendar() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFavorites()
  }, [])

  const fetchFavorites = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = '/login'
      return
    }

    const { data: favs } = await supabase
      .from('favorites')
      .select('event_id')
      .eq('user_id', user.id)

    if (favs && favs.length > 0) {
      const ids = favs.map(f => f.event_id)
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .in('id', ids)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })

      if (eventData) setEvents(eventData)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-black dark:text-white p-4">
      <div className="max-w-md mx-auto">
        <header className="flex items-center gap-4 mb-8">
          <Link href="/" className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm"><ChevronLeft /></Link>
          <h1 className="text-2xl font-black flex items-center gap-2"><Calendar className="text-brand" /> Takvimim</h1>
        </header>

        {loading ? <div>Yükleniyor...</div> : (
          <div className="space-y-4">
            {events.length === 0 && <div className="text-gray-500">Henüz favori etkinliğiniz yok.</div>}

            {events.map(e => (
              <div key={e.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-lg leading-tight mb-1">{e.title}</h3>
                  <div className="text-xs text-brand font-bold uppercase mb-2">{e.category}</div>
                  <div className="text-sm text-gray-500 flex items-center gap-1"><Clock size={14} /> {new Date(e.start_time).toLocaleDateString('tr-TR')}</div>
                  <div className="text-sm text-gray-500 flex items-center gap-1"><MapPin size={14} /> {e.venue_name}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
