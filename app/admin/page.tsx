// app/admin/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Trash2, Edit, Upload, ImageIcon, MapPin, Calendar, Check, AlertTriangle, Ban, Music, Inbox, List, Phone, Mail, User, FileSpreadsheet, Download, Plus, Search, Info } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Venue, Organizer } from '@/lib/types'

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'events' | 'applications'>('events')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [pin, setPin] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [events, setEvents] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [organizers, setOrganizers] = useState<Organizer[]>([])

  const [editingId, setEditingId] = useState<number | null>(null)

  // Form - Updated with new fields
  const [formData, setFormData] = useState({
    title: '',
    // Venue Logic
    venue_mode: 'existing' as 'existing' | 'new',
    venue_id: '',
    venue_name: '', // For new venue or legacy fallback
    address: '',

    category: 'Müzik',
    price: '',

    // Dates
    date: '', time: '',
    end_date: '', end_time: '',

    lat: '', lng: '',
    description: '',
    maps_url: '', image_url: '', ticket_url: '', media_url: '',
    sold_out: false,

    // New Fields
    rules: '', // Good to know
    tags: '', // Comma separated
    organizer_id: '',
    is_single_day: true, // Default true
    ticket_details: [] as any[] // Store JSONB
  })

  // Filter state
  const [showPendingOnly, setShowPendingOnly] = useState(false)

  useEffect(() => {
    fetchEvents()
    fetchApplications()
    fetchResources()
  }, [])

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('is_approved', { ascending: true }).order('id', { ascending: false })
    if (data) setEvents(data)
  }

  const triggerAutoFetch = async () => {
    if (pin !== '1823') return alert('PIN gerekli!')
    setLoading(true); setMsg('İşleniyor...')
    try {
      const res = await fetch('/api/fetch-events', { method: 'POST' })
      const json = await res.json()
      if (json.success) { alert(`✅ Başarılı! ${json.count || 0} etkinlik eklendi/güncellendi.`); fetchEvents(); }
      else alert('Hata: ' + json.error)
    } catch (e: any) { alert('Hata: ' + e.message) }
    finally { setLoading(false); setMsg('') }
  }

  const fetchApplications = async () => {
    const { data } = await supabase.from('venue_applications').select('*').order('created_at', { ascending: false })
    if (data) setApplications(data)
  }

  const fetchResources = async () => {
    const { data: v } = await supabase.from('venues').select('*').order('name');
    if (v) setVenues(v);
    const { data: o } = await supabase.from('organizers').select('*').order('name');
    if (o) setOrganizers(o);
  }

  // --- EXCEL ---
  const downloadTemplate = () => {
    const headers = [{ "Baslik": "Örnek Konser", "Mekan": "Jolly Joker", "Adres": "Kavaklıdere", "Kategori": "Müzik", "Fiyat": "250 TL", "Baslangic": "2025-12-30 21:00", "Bitis": "2025-12-30 23:00", "Enlem": "39.9173", "Boylam": "32.8606", "Aciklama": "Detaylar...", "Resim": "", "Bilet": "", "Kurallar": "18+" }]
    const ws = XLSX.utils.json_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Etkinlikler");
    XLSX.writeFile(wb, "Etkinlik_Taslak.xlsx");
  }

  const handleExcelUpload = (e: any) => {
    if (pin !== '1823') { if (fileInputRef.current) fileInputRef.current.value = ''; return alert('PIN girin!') }
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt: any) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        if (data.length === 0) return alert('Boş dosya!');
        if (!confirm(`${data.length} etkinlik yüklenecek. Onay?`)) return;

        setLoading(true);
        const formattedData = data.map((row: any) => ({
          title: row.Baslik || "Başlıksız",
          venue_name: row.Mekan || "Belirsiz",
          address: row.Adres || "",
          category: row.Kategori || "Müzik",
          price: row.Fiyat || "",
          start_time: row.Baslangic ? new Date(row.Baslangic).toISOString() : new Date().toISOString(),
          end_time: row.Bitis ? new Date(row.Bitis).toISOString() : null,
          lat: parseFloat(row.Enlem || 0),
          lng: parseFloat(row.Boylam || 0),
          description: row.Aciklama || "",
          image_url: row.Resim || "",
          ticket_url: row.Bilet || "",
          rules: row.Kurallar || "",
          is_approved: true, sold_out: false
        }));

        const { error } = await supabase.from('events').insert(formattedData);
        if (error) throw error;
        alert('✅ Yüklendi!'); fetchEvents();
      } catch (err: any) { alert('Hata: ' + err.message); } finally { setLoading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };
    reader.readAsBinaryString(file);
  };

  // --- ACTIONS ---
  const handleEditClick = (event: any) => {
    setEditingId(event.id)
    const start = new Date(event.start_time)
    const end = event.end_time ? new Date(event.end_time) : null

    setFormData({
      title: event.title,
      venue_mode: event.venue_id ? 'existing' : 'new',
      venue_id: event.venue_id?.toString() || '',
      venue_name: event.venue_name,
      address: event.address || '',
      category: event.category,
      price: event.price,
      date: start.toISOString().split('T')[0],
      time: start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', hour12: false }),
      end_date: end ? end.toISOString().split('T')[0] : '',
      end_time: end ? end.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
      lat: event.lat.toString(),
      lng: event.lng.toString(),
      description: event.description || '',
      maps_url: event.maps_url || '',
      image_url: event.image_url || '',
      ticket_url: event.ticket_url || '',
      media_url: event.media_url || '',
      sold_out: event.sold_out || false,
      rules: event.rules || '',
      tags: event.tags ? event.tags.join(', ') : '',
      organizer_id: event.organizer_id?.toString() || '',
      is_single_day: !event.end_time || (new Date(event.start_time).toDateString() === new Date(event.end_time).toDateString()),
      ticket_details: event.ticket_details || []
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => { setEditingId(null); resetForm(); }
  const resetForm = () => {
    setFormData({
      title: '', venue_mode: 'existing', venue_id: '', venue_name: '', address: '', category: 'Müzik', price: '',
      date: '', time: '', end_date: '', end_time: '', lat: '', lng: '',
      description: '', maps_url: '', image_url: '', ticket_url: '', media_url: '', sold_out: false,
      rules: '', tags: '', organizer_id: '', is_single_day: true, ticket_details: []
    })
  }

  const handleApprove = async (id: number) => {
    if (pin !== '1823') return alert('Yetkisiz!')
    await supabase.from('events').update({ is_approved: true }).eq('id', id)
    fetchEvents()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Emin misin?')) return
    if (pin !== '1823') return alert('Yetkisiz!')
    await supabase.from('events').delete().eq('id', id)
    fetchEvents()
  }

  const calculateEndDate = () => {
    // Helper to auto-set end date same as start date if empty
    if (formData.date && !formData.end_date) {
      setFormData(prev => ({ ...prev, end_date: prev.date }))
    }
  }

  const extractCoordsFromLink = () => {
    const url = formData.maps_url;
    const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) { setFormData(prev => ({ ...prev, lat: match[1], lng: match[2] })); alert(`✅ Koordinat: ${match[1]}, ${match[2]}`); }
    else { alert('❌ Koordinat okunamadı. Link formatı: .../maps/...@lat,lng,...'); }
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (pin !== '1823') return alert('Hatalı PIN!')
    setLoading(true); setMsg('')

    try {
      const startIso = new Date(`${formData.date}T${formData.time}`).toISOString()
      let endIso = null

      if (!formData.is_single_day && formData.end_date && formData.end_time) {
        endIso = new Date(`${formData.end_date}T${formData.end_time}`).toISOString()
      } else if (formData.is_single_day) {
        // Tek günlükse bitiş saati opsiyonel, ama genelde 2-3 saat sonrası denilebilir veya null bırakılabilir.
        // Kullanıcıdan bitiş saati almadıysak null. 
        // Ama eğer TIME girildiyse (tek gün ama saat aralığı), o zaman aynı günün o saati.
        // Şimdilik sadece Time inputu var mı UI'da? Evet, Tek Günlük olsa bile "Saat" var (Başlangıç).
        // Bitiş saati inputunu gizleyeceğiz. O yüzden endIso null olabilir.
        // Veya, aynı gün Bitiş Saati seçtirmek ister miyiz?
        // Basitlik için: Tek Günlük -> End Time = Null (Database handle eder veya frontend gösterirken start+3 saat varsayar)
      }

      // 1. Handle Venue
      let finalVenueId = formData.venue_id ? parseInt(formData.venue_id) : null;
      let finalVenueName = formData.venue_name;
      let finalAddress = formData.address;
      let finalLat = parseFloat(formData.lat.toString().replace(',', '.'));
      let finalLng = parseFloat(formData.lng.toString().replace(',', '.'));

      if (formData.venue_mode === 'existing' && finalVenueId) {
        const selectedVenue = venues.find(v => v.id === finalVenueId);
        if (selectedVenue) {
          finalVenueName = selectedVenue.name;
          finalAddress = selectedVenue.address || finalAddress;
          finalLat = selectedVenue.lat || finalLat;
          finalLng = selectedVenue.lng || finalLng;
        }
      } else if (formData.venue_mode === 'new') {
        // Create new venue automatically if details provided
        if (finalVenueName && !finalVenueId) {
          const { data: newVenue, error } = await supabase.from('venues').insert([{
            name: finalVenueName, address: finalAddress, lat: finalLat, lng: finalLng
          }]).select().single()
          if (newVenue) { finalVenueId = newVenue.id; fetchResources(); }
        }
      }

      const payload = {
        title: formData.title, description: formData.description,
        venue_name: finalVenueName, venue_id: finalVenueId, address: finalAddress,
        category: formData.category, price: formData.price,
        start_time: startIso, end_time: endIso,
        lat: finalLat, lng: finalLng,
        image_url: formData.image_url, ticket_url: formData.ticket_url, maps_url: formData.maps_url, media_url: formData.media_url,
        sold_out: formData.sold_out, is_approved: true,
        rules: formData.rules,
        ticket_details: formData.ticket_details, // Preserve/Update ticket details
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        organizer_id: formData.organizer_id ? parseInt(formData.organizer_id) : null
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

  const handleChange = (e: any) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setFormData({ ...formData, [e.target.name]: value })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 font-sans text-gray-800 dark:text-gray-100 pb-32">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm flex items-center gap-4 border border-gray-200 dark:border-gray-700 w-full md:w-auto">
            <div className="font-bold text-gray-700 dark:text-gray-300 text-xs">ADMİN PIN:</div>
            <input value={pin} onChange={(e) => setPin(e.target.value)} type="password" className="border p-2 rounded outline-none focus:border-brand dark:bg-gray-700 dark:border-gray-600 w-24" placeholder="****" />
          </div>

          <div className="bg-gray-200 dark:bg-gray-800 p-1 rounded-lg flex gap-1 w-full md:w-auto">
            <button onClick={() => setActiveTab('events')} className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-bold transition flex-1 justify-center ${activeTab === 'events' ? 'bg-white dark:bg-gray-600 shadow-sm text-brand' : 'text-gray-500 hover:text-gray-700'}`}><List size={16} /> Etkinlikler</button>
            <button onClick={() => setActiveTab('applications')} className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-bold transition flex-1 justify-center ${activeTab === 'applications' ? 'bg-white dark:bg-gray-600 shadow-sm text-brand' : 'text-gray-500 hover:text-gray-700'}`}><Inbox size={16} /> Başvurular {applications.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{applications.length}</span>}</button>
            <button onClick={triggerAutoFetch} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-purple-700 whitespace-nowrap">⚡ Otomatik Çek</button>
          </div>
        </div>

        {activeTab === 'events' && (
          <div className="space-y-8 animate-in fade-in">
            {/* --- FORM SECTION --- */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className={`${editingId ? 'bg-yellow-500' : 'bg-brand'} p-4 text-white text-center transition-colors flex justify-between items-center px-6`}>
                <div className="w-8"></div>
                <h1 className="text-xl font-black tracking-tighter">{editingId ? 'ETKİNLİK DÜZENLE' : 'YENİ ETKİNLİK OLUŞTUR'}</h1>
                <button type="button" onClick={resetForm} className="text-white/80 hover:text-white text-xs font-bold underline">Temizle</button>
              </div>
              <div className="p-6 md:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">

                  {/* 1. ROW: BASIC INFO */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <label className="block text-xs font-bold text-gray-400 uppercase">Etkinlik Detayları</label>
                      <input name="title" value={formData.title} onChange={handleChange} required className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 font-bold text-lg" placeholder="Etkinlik Başlığı" />

                      <div className="flex gap-2">
                        <select name="category" value={formData.category} onChange={handleChange} className="w-1/2 border p-3 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600">{['Müzik', 'Tiyatro', 'Sanat', 'Spor', 'Komedi', 'Sinema', 'Yeme-İçme', 'Workshop', 'Çocuk'].map(c => <option key={c}>{c}</option>)}</select>
                        <input name="price" value={formData.price} onChange={handleChange} required className="w-1/2 border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600" placeholder="Fiyat (Örn: 250 TL)" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Mekan Seçimi:</label>
                          <div className="flex bg-gray-100 dark:bg-gray-900 rounded p-1">
                            <button type="button" onClick={() => setFormData({ ...formData, venue_mode: 'existing' })} className={`text-xs px-2 py-1 rounded ${formData.venue_mode === 'existing' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>Listeden</button>
                            <button type="button" onClick={() => { setFormData({ ...formData, venue_mode: 'new', venue_id: '' }) }} className={`text-xs px-2 py-1 rounded ${formData.venue_mode === 'new' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>Yeni Ekle</button>
                          </div>
                        </div>

                        {formData.venue_mode === 'existing' ? (
                          <select name="venue_id" value={formData.venue_id} onChange={handleChange} className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600">
                            <option value="">-- Mekan Seç --</option>
                            {venues.map(v => <option key={v.id} value={v.id}>{v.name} ({v.address?.slice(0, 20)}...)</option>)}
                          </select>
                        ) : (
                          <input name="venue_name" value={formData.venue_name} onChange={handleChange} placeholder="Yeni Mekan Adı" className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200" />
                        )}

                        {/* Address & Coords always visible but maybe pre-filled */}
                        <textarea name="address" value={formData.address} onChange={handleChange} rows={2} className="w-full border p-3 rounded-lg resize-none text-sm dark:bg-gray-700 dark:border-gray-600" placeholder="Açık Adres"></textarea>
                        <div className="flex gap-2">
                          <input name="lat" value={formData.lat} onChange={handleChange} required placeholder="Lat" className="w-1/2 border p-2 rounded text-sm font-mono dark:bg-gray-700" />
                          <input name="lng" value={formData.lng} onChange={handleChange} required placeholder="Lng" className="w-1/2 border p-2 rounded text-sm font-mono dark:bg-gray-700" />
                        </div>
                        <div className="flex gap-2">
                          <input name="maps_url" value={formData.maps_url} onChange={handleChange} placeholder="Google Maps Linki" className="w-full border p-2 rounded text-xs dark:bg-gray-700" />
                          <button type="button" onClick={extractCoordsFromLink} className="bg-gray-200 dark:bg-gray-600 px-3 rounded text-xs hover:bg-gray-300">Bul</button>
                        </div>
                      </div>
                    </div>

                    {/* 2. COLUMN: DATES & EXTRAS */}
                    <div className="space-y-4">
                      <label className="block text-xs font-bold text-gray-400 uppercase">Zamanlama & Ekstra</label>

                      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-700 space-y-3">
                        <div className="flex gap-2 items-center">
                          <span className="w-16 text-xs font-bold text-gray-500">BAŞLANGIÇ</span>
                          <input type="date" name="date" value={formData.date} onChange={(e) => { handleChange(e); calculateEndDate(); }} required className="flex-1 border p-2 rounded dark:bg-gray-700 dark:border-gray-600" />
                          <input type="time" name="time" value={formData.time} onChange={handleChange} required className="w-24 border p-2 rounded dark:bg-gray-700 dark:border-gray-600" />
                        </div>

                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={formData.is_single_day} onChange={(e) => setFormData({ ...formData, is_single_day: e.target.checked })} className="w-4 h-4" />
                          <label className="text-xs font-bold text-gray-500">Tek Günlük Etkinlik</label>
                        </div>

                        {!formData.is_single_day && (
                          <div className="flex gap-2 items-center animate-in fade-in">
                            <span className="w-16 text-xs font-bold text-gray-500">BİTİŞ</span>
                            <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} className="flex-1 border p-2 rounded dark:bg-gray-700 dark:border-gray-600" />
                            <input type="time" name="end_time" value={formData.end_time} onChange={handleChange} className="w-24 border p-2 rounded dark:bg-gray-700 dark:border-gray-600" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <input name="image_url" value={formData.image_url} onChange={handleChange} className="w-full border p-3 rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600" placeholder="Afiş Görsel URL" />
                        <div className="flex gap-2">
                          <input name="ticket_url" value={formData.ticket_url} onChange={handleChange} className="w-1/2 border p-3 rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600" placeholder="Bilet URL" />
                          <input name="media_url" value={formData.media_url} onChange={handleChange} className="w-1/2 border p-3 rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600" placeholder="Video/Müzik URL" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <select name="organizer_id" value={formData.organizer_id} onChange={handleChange} className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm">
                          <option value="">-- Organizatör (Opsiyonel) --</option>
                          {organizers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                        <input name="tags" value={formData.tags} onChange={handleChange} className="w-full border p-3 rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600" placeholder="Etiketler (Virgül ile ayır: Caz, Yılbaşı...)" />
                      </div>

                      <div className="flex gap-2 items-center bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/30 cursor-pointer" onClick={() => setFormData({ ...formData, sold_out: !formData.sold_out })}>
                        <input type="checkbox" name="sold_out" checked={formData.sold_out} onChange={handleChange} className="w-5 h-5 cursor-pointer accent-red-600" />
                        <span className="font-bold text-red-600 text-sm flex items-center gap-1"><Ban size={16} /> BİLETLER TÜKENDİ (SOLD OUT)</span>
                      </div>

                      <div className="space-y-4 border-t pt-4 dark:border-gray-700">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-gray-400 uppercase">Bilet Seçenekleri</label>
                          <button type="button" onClick={() => setFormData({ ...formData, ticket_details: [...formData.ticket_details, { name: '', price: '', status: 'active' }] })} className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded font-bold hover:bg-gray-300 flex items-center gap-1"><Plus size={12} /> Ekle</button>
                        </div>
                        {formData.ticket_details.map((ticket, idx) => (
                          <div key={idx} className="flex gap-2 items-center bg-gray-50 dark:bg-gray-800 p-2 rounded border dark:border-gray-700">
                            <input placeholder="Tür" value={ticket.name} onChange={(e) => { const newDetails = [...formData.ticket_details]; newDetails[idx].name = e.target.value; setFormData({ ...formData, ticket_details: newDetails }); }} className="flex-1 border p-2 rounded text-xs dark:bg-gray-700 dark:border-gray-600" />
                            <input placeholder="Fiyat" value={ticket.price} onChange={(e) => { const newDetails = [...formData.ticket_details]; newDetails[idx].price = e.target.value; setFormData({ ...formData, ticket_details: newDetails }); }} className="w-20 border p-2 rounded text-xs dark:bg-gray-700 dark:border-gray-600" />
                            <select value={ticket.status} onChange={(e) => { const newDetails = [...formData.ticket_details]; newDetails[idx].status = e.target.value; setFormData({ ...formData, ticket_details: newDetails }); }} className="w-24 border p-2 rounded text-xs dark:bg-gray-700 dark:border-gray-600">
                              <option value="active">Satışta</option>
                              <option value="sold_out">Tükendi</option>
                            </select>
                            <button type="button" onClick={() => { const newDetails = formData.ticket_details.filter((_, i) => i !== idx); setFormData({ ...formData, ticket_details: newDetails }); }} className="p-2 text-red-500 hover:bg-red-100 rounded"><Trash2 size={14} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 3. ROW: DETAILS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className="w-full border p-3 rounded-lg resize-none dark:bg-gray-700 dark:border-gray-600" placeholder="Etkinlik Açıklaması..."></textarea>
                    <textarea name="rules" value={formData.rules} onChange={handleChange} rows={4} className="w-full border p-3 rounded-lg resize-none dark:bg-gray-700 dark:border-gray-600 font-mono text-sm bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200" placeholder="Good to Know / Kurallar (Örn: 18 yaş sınırı vardır. Kamera yasaktır.)"></textarea>
                  </div>

                  <button className={`w-full text-white py-4 rounded-xl font-black text-lg shadow-xl transform transition hover:scale-[1.01] ${editingId ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-brand hover:bg-brand-dark'}`}>
                    {loading ? 'İŞLENİYOR...' : (editingId ? 'DEĞİŞİKLİKLERİ KAYDET' : 'ETKİNLİĞİ YAYINLA')}
                  </button>
                  {msg && <div className="text-center p-3 rounded-lg font-bold bg-gray-100 dark:bg-gray-800 dark:text-white border dark:border-gray-700">{msg}</div>}
                </form>
              </div>
            </div>

            {/* EXCEL UPLOAD */}
            <div className="bg-green-50 dark:bg-gray-800 p-6 rounded-2xl shadow border border-green-100 dark:border-gray-700 flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1">
                <h3 className="font-bold text-green-800 dark:text-green-400 mb-2 flex items-center gap-2"><FileSpreadsheet size={20} /> Toplu Yükleme</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Excel dosyası ile çoklu etkinlik yükleyebilirsiniz.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={downloadTemplate} className="bg-white dark:bg-gray-700 text-gray-700 dark:text-white px-4 py-2 rounded-lg border text-sm font-bold shadow-sm hover:bg-gray-50"><Download size={14} className="inline mr-1" /> Taslak İndir</button>
                <div className="relative">
                  <input ref={fileInputRef} type="file" accept=".xlsx, .xls" onChange={handleExcelUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <button className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-green-700 pointer-events-none"><Upload size={14} className="inline mr-1" /> Excel Yükle</button>
                </div>
              </div>
            </div>

            {/* LIST */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                <span className="font-bold text-gray-700 dark:text-gray-300">YÖNETİM LİSTESİ ({events.length})</span>
                <div className="flex gap-2">
                  <button onClick={() => setShowPendingOnly(!showPendingOnly)} className={`px-3 py-1 rounded-lg text-xs font-bold ${showPendingOnly ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                    {showPendingOnly ? 'Tümünü Göster' : 'Onay Bekleyenler'}
                  </button>
                </div>
              </div>
              <div className="divide-y dark:divide-gray-700">
                {events.filter(e => !showPendingOnly || !e.is_approved).map(event => (
                  <div key={event.id} className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition flex flex-col md:flex-row gap-4 items-start md:items-center justify-between ${!event.is_approved ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                    <div className="flex gap-3 items-center">
                      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-lg shrink-0 flex items-center justify-center overflow-hidden">
                        {event.image_url ? <img src={event.image_url} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-gray-400" />}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white leading-tight">{event.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex gap-2">
                          <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(event.start_time).toLocaleDateString('tr-TR')}</span>
                          <span className="flex items-center gap-1"><MapPin size={12} /> {event.venue_name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto justify-end">
                      {!event.is_approved && <button onClick={() => handleApprove(event.id)} className="px-3 py-1 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700">ONAYLA</button>}
                      <button onClick={() => handleEditClick(event)} className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-900/30 rounded hover:bg-blue-100"><Edit size={16} /></button>
                      <button onClick={() => handleDelete(event.id)} className="p-2 text-red-600 bg-red-50 dark:bg-red-900/30 rounded hover:bg-red-100"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* APPLICATIONS TAB */}
        {activeTab === 'applications' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2"><Inbox size={28} className="text-brand" /> MEKAN BAŞVURULARI</h2>
              {applications.length === 0 && <div className="text-center py-12 text-gray-400 italic">Henüz başvuru yok.</div>}
              <div className="grid gap-4">
                {applications.map((app) => (
                  <div key={app.id} className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 relative hover:shadow-md transition">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1">
                        <div className="text-xs font-bold text-brand uppercase mb-1">Mekan</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white mb-2">{app.venue_name}</div>
                        <p className="text-sm bg-white dark:bg-gray-800 p-3 rounded border dark:border-gray-600 text-gray-600 dark:text-gray-300">{app.message}</p>
                      </div>
                      <div className="w-full md:w-64 space-y-2 border-l pl-0 md:pl-6 border-gray-200 dark:border-gray-600 pt-4 md:pt-0">
                        <div className="text-xs font-bold text-gray-400 uppercase">İletişim</div>
                        <div><User size={12} className="inline mr-1" /> {app.contact_name}</div>
                        <div><Phone size={12} className="inline mr-1" /> <a href={`tel:${app.phone}`} className="hover:underline">{app.phone}</a></div>
                        <div><Mail size={12} className="inline mr-1" /> <a href={`mailto:${app.email}`} className="hover:underline">{app.email}</a></div>
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
