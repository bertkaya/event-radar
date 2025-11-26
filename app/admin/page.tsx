// app/admin/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Trash2, Edit, Upload, ImageIcon, MapPin, Calendar, Check, AlertTriangle, Ban, Music, Inbox, List, Phone, Mail, User } from 'lucide-react'

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'events' | 'applications'>('events') // Sekme Yönetimi
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [pin, setPin] = useState('')
  
  // Veriler
  const [events, setEvents] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  
  const [editingId, setEditingId] = useState<number | null>(null)
  const [bulkData, setBulkData] = useState('')

  // Form
  const [formData, setFormData] = useState({
    title: '', venue: '', address: '', category: 'Müzik', price: '', 
    date: '', time: '', lat: '', lng: '', 
    description: '', maps_url: '', image_url: '', ticket_url: '', media_url: '', sold_out: false
  })

  useEffect(() => { 
    fetchEvents()
    fetchApplications()
  }, [])

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('is_approved', { ascending: true }).order('id', { ascending: false })
    if (data) setEvents(data)
  }

  const fetchApplications = async () => {
    const { data } = await supabase.from('venue_applications').select('*').order('created_at', { ascending: false })
    if (data) setApplications(data)
  }

  // --- BAŞVURU İŞLEMLERİ ---
  const handleDeleteApplication = async (id: number) => {
    if (!confirm('Bu başvuruyu silmek istediğine emin misin?')) return
    if (pin !== '1823') return alert('PIN girin!')
    
    await supabase.from('venue_applications').delete().eq('id', id)
    fetchApplications()
  }

  // --- ETKİNLİK İŞLEMLERİ ---
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
        
        {/* GİRİŞ VE TABLAR */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm flex items-center gap-4 border border-gray-200 dark:border-gray-700 w-full md:w-auto">
                <div className="font-bold text-gray-700 dark:text-gray-300 text-xs">ADMİN GİRİŞİ:</div>
                <input value={pin} onChange={(e) => setPin(e.target.value)} type="password" className="border p-2 rounded outline-none focus:border-brand dark:bg-gray-700 dark:border-gray-600 w-full" placeholder="PIN" />
            </div>

            {/* SEKME DEĞİŞTİRİCİ */}
            <div className="bg-gray-200 dark:bg-gray-800 p-1 rounded-lg flex gap-1 w-full md:w-auto">
                <button 
                    onClick={() => setActiveTab('events')} 
                    className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-bold transition flex-1 justify-center ${activeTab === 'events' ? 'bg-white dark:bg-gray-600 shadow-sm text-brand' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <List size={16}/> Etkinlikler
                </button>
                <button 
                    onClick={() => setActiveTab('applications')} 
                    className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-bold transition flex-1 justify-center ${activeTab === 'applications' ? 'bg-white dark:bg-gray-600 shadow-sm text-brand' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Inbox size={16}/> Başvurular
                    {applications.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{applications.length}</span>}
                </button>
            </div>
        </div>

        {/* --- SEKME 1: ETKİNLİK YÖNETİMİ --- */}
        {activeTab === 'events' && (
            <div className="space-y-8 animate-in fade-in">
                {/* FORM */}
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
                
                {/* TOPLU YÜKLEME (En altta gizli gibi kalsın) */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow border border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2"><Upload size={18}/> Toplu Yükleme (JSON)</h3>
                    <textarea className="w-full h-24 border p-2 rounded text-xs font-mono bg-gray-50 dark:bg-gray-900 dark:border-gray-600 dark:text-white" placeholder='[{"title": "Konser", "lat": 41.123, ...}]' value={bulkData} onChange={(e) => setBulkData(e.target.value)}></textarea>
                    <button onClick={handleBulkUpload} className="mt-2 bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold">Yükle</button>
                </div>
            </div>
        )}

        {/* --- SEKME 2: BAŞVURULAR --- */}
        {activeTab === 'applications' && (
            <div className="space-y-4 animate-in fade-in">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <Inbox size={28} className="text-brand"/> MEKAN BAŞVURULARI
                    </h2>
                    
                    {applications.length === 0 && (
                        <div className="text-center py-12 text-gray-400 italic">Henüz başvuru yok.</div>
                    )}

                    <div className="grid gap-4">
                        {applications.map((app) => (
                            <div key={app.id} className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 relative hover:shadow-md transition">
                                <button onClick={() => handleDeleteApplication(app.id)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500" title="Sil"><Trash2 size={18}/></button>
                                
                                <div className="flex flex-col md:flex-row gap-6">
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-brand uppercase mb-1">Mekan Adı</div>
                                        <div className="text-lg font-bold text-gray-900 dark:text-white mb-4">{app.venue_name}</div>
                                        
                                        <div className="text-xs font-bold text-brand uppercase mb-1">Mesaj</div>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600">{app.message || 'Mesaj yok.'}</p>
                                    </div>
                                    
                                    <div className="w-full md:w-1/3 space-y-3 border-l border-gray-200 dark:border-gray-600 pl-0 md:pl-6 pt-4 md:pt-0">
                                        <div>
                                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-bold mb-1"><User size={12}/> Yetkili</div>
                                            <div className="text-sm font-medium">{app.contact_name}</div>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-bold mb-1"><Phone size={12}/> Telefon</div>
                                            <div className="text-sm font-medium"><a href={`tel:${app.phone}`} className="hover:text-brand hover:underline">{app.phone}</a></div>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-bold mb-1"><Mail size={12}/> E-mail</div>
                                            <div className="text-sm font-medium"><a href={`mailto:${app.email}`} className="hover:text-brand hover:underline">{app.email}</a></div>
                                        </div>
                                        <div className="text-[10px] text-gray-400 mt-4 pt-4 border-t dark:border-gray-600">
                                            Başvuru Tarihi: {new Date(app.created_at).toLocaleString('tr-TR')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  )
}