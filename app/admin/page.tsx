// app/admin/page.tsx
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase' // Gerçek veritabanı bağlantısı

export default function Admin() {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [pin, setPin] = useState('') // Basit güvenlik

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    
    // 1. Basit Güvenlik: PIN Kodu (Bunu '1823' olarak belirledim)
    if (pin !== '1823') {
      alert('Hatalı Admin PIN Kodu!')
      return
    }

    setLoading(true)
    setMsg('')
    
    const formData = new FormData(e.target)
    const data = Object.fromEntries(formData)

    try {
      // 2. Tarih ve Saati birleştir
      const isoDate = new Date(`${data.date}T${data.time}`).toISOString()

      // 3. Supabase'e Gönder
      const { error } = await supabase.from('events').insert([{
        title: data.title,
        description: data.description,
        venue_name: data.venue,
        category: data.category,
        price: data.price,
        start_time: isoDate,
        lat: parseFloat(data.lat as string),
        lng: parseFloat(data.lng as string)
      }])

      if (error) throw error

      setMsg('✅ Etkinlik Canlıya Alındı!')
      e.target.reset() // Formu temizle
      
    } catch (error: any) {
      setMsg('❌ Hata: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 font-sans">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        
        {/* Header */}
        <div className="bg-brand p-6 text-white text-center">
          <h1 className="text-2xl font-black tracking-tighter">ADMIN PANELİ</h1>
          <p className="text-xs opacity-80">VERİTABANI YÖNETİMİ</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Güvenlik Pini */}
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <label className="block text-xs font-bold text-yellow-800 mb-1 uppercase">Admin PIN Kodu</label>
              <input 
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                type="password" 
                className="block w-full border border-yellow-300 rounded-md p-2 text-sm bg-white" 
                placeholder="Şifreyi girin (1823)" 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sol Kolon */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Etkinlik Başlığı</label>
                  <input name="title" required className="w-full border border-gray-300 rounded-lg p-3 focus:border-brand outline-none" placeholder="Örn: Caz Gecesi" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Mekan</label>
                  <input name="venue" required className="w-full border border-gray-300 rounded-lg p-3 focus:border-brand outline-none" placeholder="Örn: Babylon" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Kategori</label>
                  <select name="category" className="w-full border border-gray-300 rounded-lg p-3 focus:border-brand outline-none bg-white">
                    <option>Müzik</option>
                    <option>Tiyatro</option>
                    <option>Sanat</option>
                    <option>Yeme-İçme</option>
                    <option>Spor</option>
                    <option>Sinema</option>
                    <option>Komedi</option>
                  </select>
                </div>
              </div>

              {/* Sağ Kolon */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Fiyat</label>
                  <input name="price" required className="w-full border border-gray-300 rounded-lg p-3 focus:border-brand outline-none" placeholder="Örn: 250 TL" />
                </div>
                <div className="flex gap-2">
                  <div className="w-1/2">
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Tarih</label>
                    <input type="date" name="date" required className="w-full border border-gray-300 rounded-lg p-3 focus:border-brand outline-none" />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Saat</label>
                    <input type="time" name="time" required className="w-full border border-gray-300 rounded-lg p-3 focus:border-brand outline-none" />
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Konum (Google Maps)</label>
                  <div className="flex gap-2">
                    <input name="lat" required placeholder="Lat (41.xxx)" className="w-1/2 border p-2 rounded text-sm" />
                    <input name="lng" required placeholder="Lng (29.xxx)" className="w-1/2 border p-2 rounded text-sm" />
                  </div>
                </div>
              </div>
            </div>

            {/* Açıklama */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Açıklama</label>
              <textarea name="description" rows={3} className="w-full border border-gray-300 rounded-lg p-3 focus:border-brand outline-none resize-none" placeholder="Etkinlik detayı..."></textarea>
            </div>

            <button 
              disabled={loading} 
              className="w-full py-4 bg-brand text-white font-bold rounded-xl shadow-lg hover:bg-brand-dark transition-all"
            >
              {loading ? 'Yükleniyor...' : 'Veritabanına Kaydet'}
            </button>

            {msg && (
              <div className={`text-center p-3 rounded-lg font-bold text-sm ${msg.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {msg}
              </div>
            )}

          </form>
        </div>
      </div>
    </div>
  )
}