// app/admin/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Trash2, Edit, Upload, ImageIcon, MapPin, Calendar, Check, AlertTriangle, Ban, CheckSquare, Square, X } from 'lucide-react'

export default function Admin() {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [pin, setPin] = useState('')
  const [events, setEvents] = useState<any[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [bulkData, setBulkData] = useState('')
  
  // TOPLU İŞLEM STATE'LERİ
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  // Form Verileri
  const [formData, setFormData] = useState({
    title: '', venue: '', category: 'Müzik', price: '', 
    date: '', time: '', lat: '', lng: '', 
    description: '', maps_url: '', image_url: '', ticket_url: '', sold_out: false, address: ''
  })

  useEffect(() => { fetchEvents() }, [])

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('is_approved', { ascending: true }) 
      .order('id', { ascending: false })
      
    if (data) setEvents(data)
  }

  // --- TOPLU İŞLEM FONKSİYONLARI ---

  // Tekil Seçim
  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  // Tümünü Seç / Kaldır
  const toggleSelectAll = () => {
    if (selectedIds.length === events.length) {
      setSelectedIds([]) // Hepsini kaldır
    } else {
      setSelectedIds(events.map(e => e.id)) // Hepsini seç
    }
  }

  // Toplu Onaylama
  const handleBulkApprove = async () => {
    if (pin !== '1823') return alert('PIN girin!')
    if (!confirm(`${selectedIds.length} etkinliği onaylamak istiyor musun?`)) return

    setLoading(true)
    const { error } = await supabase
      .from('events')
      .update({ is_approved: true })
      .in('id', selectedIds) // Seçili ID'lerin hepsini güncelle

    if (!error) {
      alert('✅ Seçilenler Onaylandı!')
      setSelectedIds([])
      fetchEvents()
    } else {
      alert('Hata: ' + error.message)
    }
    setLoading(false)
  }

  // Toplu Silme
  const handleBulkDelete = async () => {
    if (pin !== '1823') return alert('PIN girin!')
    if (!confirm(`DİKKAT: ${selectedIds.length} etkinliği KALICI OLARAK silmek istiyor musun?`)) return

    setLoading(true)
    const { error } = await supabase
      .from('events')
      .delete()
      .in('id', selectedIds)

    if (!error) {
      alert('🗑️ Seçilenler Silindi!')
      setSelectedIds([])
      fetchEvents()
    } else {
      alert('Hata: ' + error.message)
    }
    setLoading(false)
  }

  // --- MEVCUT FONKSİYONLAR ---

  const formatEuroDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
    }).format(date)
  }

  const handleEditClick = (event: any) => {
    setEditingId(event.id)
    const dateObj = new Date(event.start_time)
    const isoDate = dateObj.toISOString().split('T')[0]
    const isoTime = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', hour12: false })

    setFormData({
      title: event.title,
      venue: event.venue_name,
      category: event.category,
      price: event.price,
      date: isoDate,
      time: isoTime,
      lat: event.lat.toString(),
      lng: event.lng.toString(),
      description: event.description || '',
      maps_url: event.maps_url || '',
      image_url: event.image_url || '',
      ticket_url: event.ticket_url || '',
      sold_out: event.sold_out || false,
      address: event.address || ''
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    resetForm()
  }

  const resetForm = () => {
    setFormData({ title: '', venue: '', category: 'Müzik', price: '', date: '', time: '', lat: '', lng: '', description: '', maps_url: '', image_url: '', ticket_url: '', sold_out: false, address: '' })
  }

  const handleApprove = async (id: number) => {
    if (pin !== '1823') return alert('Yetkisiz işlem! PIN girin.')
    const { error } = await supabase.from('events').update({ is_approved: true }).eq('id', id)
    if (!error) { alert('✅ Etkinlik Onaylandı!'); fetchEvents() } else { alert('Hata: ' + error.message) }
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
    if (match) {
      setFormData(prev => ({ ...prev, lat: match[1], lng: match[2] }));
      alert(`✅ Koordinat: ${match[1]}, ${match[2]}`);
    } else {
      alert('❌ Koordinat okunamadı.');
    }
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (pin !== '1823') return alert('Hatalı Admin PIN Kodu!')
    setLoading(true)
    setMsg('')

    try {
      const isoDateTime = new Date(`${formData.date}T${formData.time}`).toISOString()
      const cleanLat = parseFloat(formData.lat.toString().replace(',', '.').trim())
      const cleanLng = parseFloat(formData.lng.toString().replace(',', '.').trim())

      if (isNaN(cleanLat) || isNaN(cleanLng)) throw new Error("Koordinat formatı hatalı!")

      const payload = {
        title: formData.title,
        description: formData.description,
        venue_name: formData.venue,
        category: formData.category,
        price: formData.price,
        start_time: isoDateTime,
        lat: cleanLat,
        lng: cleanLng,
        image_url: formData.image_url,
        ticket_url: formData.ticket_url,
        maps_url: formData.maps_url,
        sold_out: formData.sold_out,
        address: formData.address,
        is_approved: true
      }

      if (editingId) {
        const { error } = await supabase.from('events').update(payload).eq('id', editingId)
        if (error) throw error
        setMsg('✅ Güncellendi!')
        setEditingId(null)
      } else {
        const { error } = await supabase.from('events').insert([payload])
        if (error) throw error
        setMsg('✅ Eklendi!')
      }
      resetForm()
      fetchEvents()
    } catch (error: any) {
      setMsg('❌ Hata: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBulkUpload = async () => {
    if (pin !== '1823') return alert('PIN girin!')
    try {
      const json = JSON.parse(bulkData)
      const { error } = await supabase.from('events').insert(json)
      if (error) throw error
      alert('Toplu yükleme başarılı!')
      fetchEvents()
      setBulkData('')
    } catch (err) {
      alert('JSON Formatı Hatalı')
    }
  }

  const handleChange = (e: any) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setFormData({ ...formData, [e.target.name]: value })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 font-sans text-gray-800 pb-32"> {/* pb-32: Alt bar için boşluk */}
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* --- TOPLU İŞLEM BARI (Sticky Bottom) --- */}
        {selectedIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-6 animate-in slide-in-from-bottom-4">
            <div className="font-bold text-sm flex items-center gap-2">
              <CheckSquare size={18} className="text-brand"/> {selectedIds.length} Seçildi
            </div>
            <div className="h-6 w-[1px] bg-gray-700"></div>
            <div className="flex gap-3">
              <button onClick={handleBulkApprove} className="flex items-center gap-1 text-xs font-bold bg-green-600 hover:bg-green-500 px-3 py-2 rounded-lg transition">
                <Check size={14}/> Onayla
              </button>
              <button onClick={handleBulkDelete} className="flex items-center gap-1 text-xs font-bold bg-red-600 hover:bg-red-500 px-3 py-2 rounded-lg transition">
                <Trash2 size={14}/> Sil
              </button>
              <button onClick={() => setSelectedIds([])} className="p-1 hover:bg-gray-800 rounded-full"><X size={16}/></button>
            </div>
          </div>
        )}

        <div className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-4 border border-gray-200">
          <div className="font-bold text-gray-700">ADMİN GİRİŞİ:</div>
          <input value={pin} onChange={(e) => setPin(e.target.value)} type="password" className="border p-2 rounded outline-none focus:border-brand" placeholder="PIN (1823)" />
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className={`${editingId ? 'bg-yellow-500' : 'bg-brand'} p-6 text-white text-center transition-colors`}>
            <h1 className="text-2xl font-black tracking-tighter">{editingId ? 'DÜZENLEME MODU' : 'YENİ ETKİNLİK EKLE'}</h1>
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                   <label className="text-xs font-bold text-gray-400 uppercase">Temel Bilgiler</label>
                   <input name="title" value={formData.title} onChange={handleChange} required className="w-full border p-3 rounded-lg" placeholder="Etkinlik Adı" />
                   <div className="space-y-2">
                     <input name="venue" value={formData.venue} onChange={handleChange} required className="w-full border p-3 rounded-lg" placeholder="Mekan Adı" />
                     <textarea name="address" value={formData.address} onChange={handleChange} rows={2} className="w-full border p-3 rounded-lg resize-none text-sm bg-gray-50" placeholder="Açık Adres"></textarea>
                   </div>
                   <select name="category" value={formData.category} onChange={handleChange} className="w-full border p-3 rounded-lg bg-white">
                      {['Müzik', 'Tiyatro', 'Sanat', 'Spor', 'Komedi', 'Sinema', 'Yeme-İçme'].map(c => <option key={c}>{c}</option>)}
                   </select>
                   <div className="flex gap-2 items-center bg-gray-50 p-3 rounded-lg border cursor-pointer" onClick={() => setFormData({...formData, sold_out: !formData.sold_out})}>
                      <input type="checkbox" name="sold_out" checked={formData.sold_out} onChange={handleChange} className="w-5 h-5 cursor-pointer" />
                      <span className="font-bold text-red-600 text-sm flex items-center gap-1"><Ban size={16}/> SOLD OUT</span>
                   </div>
                </div>
                
                <div className="space-y-4">
                   <label className="text-xs font-bold text-gray-400 uppercase">Zaman & Konum</label>
                   <input name="price" value={formData.price} onChange={handleChange} required className="w-full border p-3 rounded-lg" placeholder="Fiyat" />
                   <div className="flex gap-2">
                      <div className="w-1/2"><label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Tarih</label><input type="date" name="date" value={formData.date} onChange={handleChange} required className="w-full border p-3 rounded-lg" /></div>
                      <div className="w-1/2"><label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Saat</label><input type="time" name="time" value={formData.time} onChange={handleChange} required className="w-full border p-3 rounded-lg" /></div>
                   </div>
                   <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <div className="flex gap-2 mb-2">
                         <input name="maps_url" value={formData.maps_url} onChange={handleChange} placeholder="Google Maps Linki" className="w-full border p-2 rounded text-xs" />
                         <button type="button" onClick={extractCoordsFromLink} className="bg-blue-600 text-white px-3 rounded text-xs font-bold hover:bg-blue-700">Çek</button>
                      </div>
                      <div className="flex gap-2">
                         <input name="lat" value={formData.lat} onChange={handleChange} required placeholder="Lat" className="w-1/2 border p-2 rounded text-sm font-mono" />
                         <input name="lng" value={formData.lng} onChange={handleChange} required placeholder="Lng" className="w-1/2 border p-2 rounded text-sm font-mono" />
                      </div>
                   </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Medya</label>
                <div className="flex gap-2">
                   <input name="image_url" value={formData.image_url} onChange={handleChange} className="w-1/2 border p-3 rounded-lg text-sm" placeholder="Poster URL" />
                   <input name="ticket_url" value={formData.ticket_url} onChange={handleChange} className="w-1/2 border p-3 rounded-lg text-sm" placeholder="Bilet Linki" />
                </div>
                <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="w-full border p-3 rounded-lg resize-none" placeholder="Detaylar..."></textarea>
              </div>

              <div className="flex gap-3">
                {editingId && <button type="button" onClick={handleCancelEdit} className="flex-1 bg-gray-500 text-white p-4 rounded-xl font-bold">İptal</button>}
                <button className={`flex-[2] text-white p-4 rounded-xl font-bold shadow-lg ${editingId ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-brand hover:bg-brand-dark'}`}>{loading ? 'İşleniyor...' : (editingId ? 'Kaydet' : 'Yayınla')}</button>
              </div>
              {msg && <div className="text-center p-3 rounded-lg font-bold bg-gray-100">{msg}</div>}
            </form>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow border border-gray-200">
           <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2"><Upload size={18}/> Toplu Yükleme (JSON)</h3>
           <textarea className="w-full h-24 border p-2 rounded text-xs font-mono bg-gray-50" placeholder='[{"title": "Konser", "lat": 41.123, ...}]' value={bulkData} onChange={(e) => setBulkData(e.target.value)}></textarea>
           <button onClick={handleBulkUpload} className="mt-2 bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold">Yükle</button>
        </div>

        <div className="bg-white rounded-2xl shadow border border-gray-200 overflow-hidden">
          <div className="bg-gray-100 p-4 font-bold text-gray-700 border-b flex justify-between items-center">
             <div className="flex items-center gap-2">
               {/* TÜMÜNÜ SEÇ KUTUSU */}
               <button onClick={toggleSelectAll} className="text-gray-500 hover:text-brand transition">
                 {selectedIds.length === events.length && events.length > 0 ? <CheckSquare size={20} /> : <Square size={20} />}
               </button>
               <span>YÖNETİM LİSTESİ ({events.length})</span>
             </div>
             <span className="text-[10px] bg-white px-2 py-1 rounded border text-gray-500">Üstte Onay Bekleyenler</span>
          </div>
          <div className="divide-y">
            {events.map(event => (
              <div key={event.id} className={`p-4 flex items-center justify-between hover:bg-gray-50 transition ${selectedIds.includes(event.id) ? 'bg-brand/5' : ''} ${!event.is_approved ? 'border-l-4 border-red-500 bg-red-50' : ''}`}>
                
                <div className="flex items-center gap-3 overflow-hidden">
                  {/* SEÇİM KUTUSU */}
                  <button onClick={() => toggleSelect(event.id)} className="shrink-0 text-gray-400 hover:text-brand">
                    {selectedIds.includes(event.id) ? <CheckSquare size={20} className="text-brand" /> : <Square size={20} />}
                  </button>

                  <div className="shrink-0">
                    {event.image_url ? <img src={event.image_url} className="w-12 h-12 object-cover rounded-md"/> : <div className="w-12 h-12 bg-gray-200 rounded-md flex items-center justify-center"><ImageIcon size={16} className="text-gray-400"/></div>}
                  </div>
                  
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 flex items-center gap-2 truncate">
                      {event.title} 
                      {!event.is_approved && <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded uppercase font-black flex items-center gap-1"><AlertTriangle size={10}/> ONAYLA!</span>}
                      {event.sold_out && <span className="bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded uppercase">SOLD OUT</span>}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                       <span className="flex items-center gap-1 text-brand font-bold"><Calendar size={12}/> {formatEuroDate(event.start_time)}</span>
                       <span className="flex items-center gap-1 truncate"><MapPin size={12}/> {event.venue_name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0 ml-2">
                  {!event.is_approved && <button onClick={() => handleApprove(event.id)} className="p-2 bg-green-600 text-white hover:bg-green-700 rounded shadow-md font-bold text-xs flex items-center gap-1"><Check size={16}/> ONAYLA</button>}
                  <button onClick={() => handleEditClick(event)} className="p-2 text-blue-600 hover:bg-blue-50 rounded border border-blue-100"><Edit size={16}/></button>
                  <button onClick={() => handleDelete(event.id)} className="p-2 text-red-600 hover:bg-red-50 rounded border border-red-100"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}