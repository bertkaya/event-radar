// app/venue/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Plus, Clock, CheckCircle, XCircle, MapPin, Calendar, Image as ImageIcon, LogOut } from 'lucide-react'

export default function VenuePortal() {
  const [user, setUser] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const router = useRouter()

  // Form
  const [formData, setFormData] = useState({
    title: '', venue_name: '', category: 'Müzik', price: '', 
    date: '', time: '', lat: '', lng: '', 
    description: '', maps_url: '', image_url: '', ticket_url: ''
  })

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login') // Giriş yapmamışsa login'e at
      return
    }
    setUser(user)
    fetchMyEvents(user.id)
  }

  const fetchMyEvents = async (userId: string) => {
    // Sadece bu kullanıcının eklediği etkinlikleri çek
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('owner_id', userId)
      .order('id', { ascending: false })
    
    if (data) setEvents(data)
    setLoading(false)
  }

  const extractCoordsFromLink = () => {
    const url = formData.maps_url;
    const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match = url.match(regex);
    if (match) {
      setFormData(prev => ({ ...prev, lat: match[1], lng: match[2] }));
      alert(`✅ Konum bulundu!`);
    } else {
      alert('❌ Linkten konum alınamadı.');
    }
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const isoDate = new Date(`${formData.date}T${formData.time}`).toISOString()
      const cleanLat = parseFloat(formData.lat.toString().replace(',', '.').trim())
      const cleanLng = parseFloat(formData.lng.toString().replace(',', '.').trim())

      const { error } = await supabase.from('events').insert([{
        title: formData.title,
        venue_name: formData.venue_name,
        description: formData.description,
        category: formData.category,
        price: formData.price,
        start_time: isoDate,
        lat: cleanLat,
        lng: cleanLng,
        image_url: formData.image_url,
        ticket_url: formData.ticket_url,
        maps_url: formData.maps_url,
        owner_id: user.id, // BU ETKİNLİĞİ BU KULLANICI EKLEDİ
        is_approved: false // OTOMATİK OLARAK ONAYSIZ (Admin onayı bekler)
      }])

      if (error) throw error

      alert('✅ Etkinlik gönderildi! Admin onayından sonra yayına girecek.')
      setFormData({ title: '', venue_name: '', category: 'Müzik', price: '', date: '', time: '', lat: '', lng: '', description: '', maps_url: '', image_url: '', ticket_url: '' })
      setShowForm(false)
      fetchMyEvents(user.id)

    } catch (error: any) {
      alert('Hata: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  if (loading) return <div className="h-screen flex items-center justify-center text-brand font-bold">Yükleniyor...</div>

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-10">
      
      {/* Header */}
      <div className="bg-white p-6 shadow-sm border-b border-gray-200 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black tracking-tighter text-gray-900">MEKAN PANELİ</h1>
          <p className="text-xs text-gray-500">Etkinliklerini buradan yönet</p>
        </div>
        <div className="flex items-center gap-4">
           <span className="text-xs font-bold hidden md:block">{user.email}</span>
           <button onClick={() => router.push('/')} className="text-gray-400 hover:text-red-600"><LogOut size={20}/></button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        
        {/* Üst Aksiyon */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-gray-700 text-lg">Etkinliklerim ({events.length})</h2>
          <button 
            onClick={() => setShowForm(!showForm)} 
            className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition shadow-lg"
          >
            {showForm ? 'Vazgeç' : <><Plus size={18}/> Yeni Ekle</>}
          </button>
        </div>

        {/* EKLEME FORMU */}
        {showForm && (
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-200 mb-8 animate-in slide-in-from-top-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <input name="title" value={formData.title} onChange={handleChange} required className="border p-3 rounded-lg w-full" placeholder="Etkinlik Başlığı" />
                <input name="venue_name" value={formData.venue_name} onChange={handleChange} required className="border p-3 rounded-lg w-full" placeholder="Mekan Adı" />
              </div>
              
              <div className="grid md:grid-cols-3 gap-4">
                <select name="category" value={formData.category} onChange={handleChange} className="border p-3 rounded-lg bg-white">
                   {['Müzik', 'Tiyatro', 'Sanat', 'Spor', 'Komedi', 'Sinema', 'Yeme-İçme'].map(c => <option key={c}>{c}</option>)}
                </select>
                <input name="price" value={formData.price} onChange={handleChange} required className="border p-3 rounded-lg" placeholder="Fiyat (250 TL)" />
                <input name="ticket_url" value={formData.ticket_url} onChange={handleChange} className="border p-3 rounded-lg" placeholder="Bilet Linki" />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                 <div className="flex gap-2">
                    <input type="date" name="date" value={formData.date} onChange={handleChange} required className="border p-3 rounded-lg w-full" />
                    <input type="time" name="time" value={formData.time} onChange={handleChange} required className="border p-3 rounded-lg w-full" />
                 </div>
                 <div className="flex gap-2 bg-blue-50 p-2 rounded-lg border border-blue-100">
                    <input name="maps_url" value={formData.maps_url} onChange={handleChange} placeholder="Google Maps Linki" className="border p-2 rounded-lg w-full text-xs" />
                    <button type="button" onClick={extractCoordsFromLink} className="bg-blue-600 text-white px-3 rounded-lg text-xs font-bold whitespace-nowrap">Bul</button>
                 </div>
              </div>

              <div className="flex gap-2 hidden"> {/* Koordinatlar gizli input olarak tutulur */}
                 <input name="lat" value={formData.lat} readOnly />
                 <input name="lng" value={formData.lng} readOnly />
              </div>

              <input name="image_url" value={formData.image_url} onChange={handleChange} className="border p-3 rounded-lg w-full" placeholder="Poster URL (Resim Linki)" />
              <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="border p-3 rounded-lg w-full resize-none" placeholder="Açıklama..."></textarea>

              <button disabled={submitting} className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition">
                {submitting ? 'Gönderiliyor...' : 'Onaya Gönder'}
              </button>
            </form>
          </div>
        )}

        {/* LİSTE */}
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="bg-white p-4 rounded-2xl border border-gray-200 flex items-center gap-4 hover:shadow-md transition">
              {/* Durum İkonu */}
              <div className="shrink-0">
                {event.is_approved ? (
                  <div className="bg-green-100 p-2 rounded-full text-green-600" title="Yayında"><CheckCircle size={24}/></div>
                ) : (
                  <div className="bg-yellow-100 p-2 rounded-full text-yellow-600" title="Onay Bekliyor"><Clock size={24}/></div>
                )}
              </div>

              <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                 {event.image_url ? <img src={event.image_url} className="w-full h-full object-cover"/> : <ImageIcon className="m-auto mt-4 text-gray-300"/>}
              </div>

              <div className="flex-1 min-w-0">
                 <div className="flex justify-between mb-1">
                    <h3 className="font-bold text-gray-900 truncate">{event.title}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${event.is_approved ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                      {event.is_approved ? 'YAYINDA' : 'ONAY BEKLİYOR'}
                    </span>
                 </div>
                 <div className="flex gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(event.start_time).toLocaleDateString('tr-TR')}</span>
                    <span className="flex items-center gap-1"><MapPin size={12}/> {event.venue_name}</span>
                 </div>
              </div>
            </div>
          ))}

          {events.length === 0 && (
            <div className="text-center py-12 text-gray-400">Henüz hiç etkinlik eklemedin.</div>
          )}
        </div>

      </div>
    </div>
  )
}