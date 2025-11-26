// app/admin/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Trash2, Edit, Upload, ImageIcon, MapPin, Calendar, Check, AlertTriangle, Ban, Music } from 'lucide-react'

export default function Admin() {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [pin, setPin] = useState('')
  const [events, setEvents] = useState<any[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [bulkData, setBulkData] = useState('')

  // Form (media_url eklendi)
  const [formData, setFormData] = useState({
    title: '', venue: '', address: '', category: 'Müzik', price: '', 
    date: '', time: '', lat: '', lng: '', 
    description: '', maps_url: '', image_url: '', ticket_url: '', media_url: '', sold_out: false
  })

  useEffect(() => { fetchEvents() }, [])

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('is_approved', { ascending: true }).order('id', { ascending: false })
    if (data) setEvents(data)
  }

  const formatEuroDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
  }

  const handleEditClick = (event: any) => {
    setEditingId(event.id)
    const dateObj = new Date(event.start_time)
    setFormData({
      title: event.title, venue: event.venue_name, address: event.address || '', category: event.category, price: event.price,
      date: dateObj.toISOString().split('T')[0],
      time: dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', hour12: false }),
      lat: event.lat.toString(), lng: event.lng.toString(),
      description: event.description || '', maps_url: event.maps_url || '', image_url: event.image_url || '',
      ticket_url: event.ticket_url || '', media_url: event.media_url || '', sold_out: event.sold_out || false
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => { setEditingId(null); resetForm(); }
  const resetForm = () => { setFormData({ title: '', venue: '', address: '', category: 'Müzik', price: '', date: '', time: '', lat: '', lng: '', description: '', maps_url: '', image_url: '', ticket_url: '', media_url: '', sold_out: false }) }

  const handleApprove = async (id: number) => {
    if (pin !== '1823') return alert('Yetkisiz işlem!')
    await supabase.from('events').update({ is_approved: true }).eq('id', id)
    fetchEvents()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Silmek istediğine emin misin?')) return
    if (pin !== '1823') return alert('Yetkisiz işlem!')
    await supabase.from('events').delete().eq('id', id)
    fetchEvents()
  }

  const extractCoordsFromLink = () => {
    const url = formData.maps_url;
    const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match = url.match(regex);
    if (match) { setFormData(prev => ({ ...prev, lat: match[1], lng: match[2] })); alert(`✅ Koordinat bulundu!`); } 
    else { alert('❌ Koordinat okunamadı.'); }
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (pin !== '1823') return alert('Hatalı Admin PIN Kodu!')
    setLoading(true); setMsg('')

    try {
      const isoDateTime = new Date(`${formData.date}T${formData.time}`).toISOString()
      const cleanLat = parseFloat(formData.lat.toString().replace(',', '.').trim())
      const cleanLng = parseFloat(formData.lng.toString().replace(',', '.').trim())

      const payload = {
        title: formData.title, description: formData.description, venue_name: formData.venue, address: formData.address,
        category: formData.category, price: formData.price, start_time: isoDateTime, lat: cleanLat, lng: cleanLng,
        image_url: formData.image_url, ticket_url: formData.ticket_url, maps_url: formData.maps_url, media_url: formData.media_url,
        sold_out: formData.sold_out, is_approved: true
      }

      if (editingId) {
        await supabase.from('events').update(payload).eq('id', editingId)
        setMsg('✅ Güncellendi!')
        setEditingId(null)
      } else {
        await supabase.from('events').insert([payload])
        setMsg('✅ Eklendi!')
      }
      resetForm(); fetchEvents()
    } catch (error: any) { setMsg('❌ Hata: ' + error.message) } 
    finally { setLoading(false) }
  }

  const handleBulkUpload = async () => {
    if (pin !== '1823') return alert('PIN girin!');
    try {
      const json = JSON.parse(bulkData);
      await supabase.from('events').insert(json);
      alert('Toplu yükleme başarılı!'); fetchEvents(); setBulkData('');
    } catch (err) { alert('JSON Formatı Hatalı') }
  }

  const handleChange = (e: any) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setFormData({ ...formData, [e.target.name]: value })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 font-sans text-gray-800 dark:text-gray-100">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm flex items-center gap-4 border border-gray-200 dark:border-gray-700">
          <div className="font-bold text-gray-700 dark:text-gray-300">ADMİN GİRİŞİ:</div>
          <input value={pin} onChange={(e) => setPin(e.target.value)} type="password" className="border p-2 rounded outline-none focus:border-brand dark:bg-gray-700 dark:border-gray-600" placeholder="PIN" />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className={`${editingId ? 'bg-yellow-500' : 'bg-brand'} p-6 text-white text-center transition-colors`}>
            <h1 className="text-2xl font-black tracking-tighter">{editingId ? 'DÜZENLEME MODU' : 'YENİ ETKİNLİK EKLE'}</h1>
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                   <input name="title" value={formData.title} onChange={handleChange} required className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600" placeholder="Etkinlik Adı" />
                   <div className="space-y-2">
                     <input name="venue" value={formData.venue} onChange={handleChange} required className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600" placeholder="Mekan Adı" />
                     <textarea name="address" value={formData.address} onChange={handleChange} rows={2} className="w-full border p-3 rounded-lg resize-none text-sm bg-gray-50 dark:bg-gray-900 dark:border-gray-600" placeholder="Açık Adres"></textarea>
                   </div>
                   <select name="category" value={formData.category} onChange={handleChange} className="w-full border p-3 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600">
                      {['Müzik', 'Tiyatro', 'Sanat', 'Spor', 'Komedi', 'Sinema', 'Yeme-İçme', 'Workshop', 'Çocuk'].map(c => <option key={c}>{c}</option>)}
                   </select>
                   <div className="flex gap-2 items-center bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border cursor-pointer" onClick={() => setFormData({...formData, sold_out: !formData.sold_out})}>
                      <input type="checkbox" name="sold_out" checked={formData.sold_out} onChange={handleChange} className="w-5 h-5 cursor-pointer" />
                      <span className="font-bold text-red-600 text-sm flex items-center gap-1"><Ban size={16}/> SOLD OUT</span>
                   </div>
                </div>
                
                <div className="space-y-4">
                   <input name="price" value={formData.price} onChange={handleChange} required className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600" placeholder="Fiyat" />
                   <div className="flex gap-2">
                      <input type="date" name="date" value={formData.date} onChange={handleChange} required className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                      <input type="time" name="time" value={formData.time} onChange={handleChange} required className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                   </div>
                   <div className="bg-blue-50 dark:bg-gray-900 p-3 rounded-lg border border-blue-100 dark:border-gray-700">
                      <div className="flex gap-2 mb-2">
                         <input name="maps_url" value={formData.maps_url} onChange={handleChange} placeholder="Google Maps Linki" className="w-full border p-2 rounded text-xs dark:bg-gray-800" />
                         <button type="button" onClick={extractCoordsFromLink} className="bg-blue-600 text-white px-3 rounded text-xs font-bold hover:bg-blue-700">Çek</button>
                      </div>
                      <div className="flex gap-2">
                         <input name="lat" value={formData.lat} onChange={handleChange} required placeholder="Lat" className="w-1/2 border p-2 rounded text-sm font-mono dark:bg-gray-800" />
                         <input name="lng" value={formData.lng} onChange={handleChange} required placeholder="Lng" className="w-1/2 border p-2 rounded text-sm font-mono dark:bg-gray-800" />
                      </div>
                   </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                   <input name="image_url" value={formData.image_url} onChange={handleChange} className="w-1/2 border p-3 rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600" placeholder="Poster URL" />
                   <input name="ticket_url" value={formData.ticket_url} onChange={handleChange} className="w-1/2 border p-3 rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600" placeholder="Bilet Linki" />
                </div>
                {/* YENİ: SPOTIFY LINKI */}
                <div className="relative">
                   <Music className="absolute left-3 top-3 text-gray-400" size={18}/>
                   <input name="media_url" value={formData.media_url} onChange={handleChange} className="w-full border p-3 pl-10 rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600" placeholder="Spotify / YouTube Playlist Linki" />
                </div>
                <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="w-full border p-3 rounded-lg resize-none dark:bg-gray-700 dark:border-gray-600" placeholder="Detaylar..."></textarea>
              </div>

              <div className="flex gap-3">
                {editingId && <button type="button" onClick={handleCancelEdit} className="flex-1 bg-gray-500 text-white p-4 rounded-xl font-bold">İptal</button>}
                <button className={`flex-[2] text-white p-4 rounded-xl font-bold shadow-lg ${editingId ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-brand hover:bg-brand-dark'}`}>{loading ? 'İşleniyor...' : (editingId ? 'Kaydet' : 'Yayınla')}</button>
              </div>
              {msg && <div className="text-center p-3 rounded-lg font-bold bg-gray-100 dark:bg-gray-900 dark:text-white">{msg}</div>}
            </form>
          </div>
        </div>

        {/* LİSTE */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gray-100 dark:bg-gray-700 p-4 font-bold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600 flex justify-between items-center"><span>YÖNETİM LİSTESİ ({events.length})</span></div>
          <div className="divide-y dark:divide-gray-700">
            {events.map(event => (
              <div key={event.id} className={`p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition ${!event.is_approved ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500' : ''}`}>
                <div className="flex items-center gap-3">
                  {event.image_url ? <img src={event.image_url} className="w-12 h-12 object-cover rounded-md"/> : <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-md flex items-center justify-center"><ImageIcon size={16} className="text-gray-400"/></div>}
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      {event.title} 
                      {!event.is_approved && <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded uppercase font-black flex items-center gap-1"><AlertTriangle size={10}/> ONAYLA!</span>}
                      {event.sold_out && <span className="bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded uppercase">SOLD OUT</span>}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1"><span className="flex items-center gap-1 text-brand font-bold"><Calendar size={12}/> {formatEuroDate(event.start_time)}</span><span className="flex items-center gap-1"><MapPin size={12}/> {event.venue_name}</span></div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!event.is_approved && <button onClick={() => handleApprove(event.id)} className="p-2 bg-green-600 text-white hover:bg-green-700 rounded shadow-md font-bold text-xs flex items-center gap-1"><Check size={16}/> ONAYLA</button>}
                  <button onClick={() => handleEditClick(event)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded border border-blue-100"><Edit size={16}/></button>
                  <button onClick={() => handleDelete(event.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded border border-red-100"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}