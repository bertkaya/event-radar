// app/admin/page.tsx
'use client'

import { useState } from 'react'
import { addLocalEvent } from '@/lib/storage' // Yerel veritabanı motorumuz

export default function Admin() {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    
    const formData = new FormData(e.target)
    const data = Object.fromEntries(formData)

    try {
      // Veriyi oluştur ve kaydet
      addLocalEvent({
        title: data.title,
        description: data.description, // Yeni eklediğimiz alan
        venue_name: data.venue,
        category: data.category,
        price: data.price,
        start_time: `${data.date}T${data.time}`, // Tarih ve saati birleştir
        lat: parseFloat(data.lat as string),
        lng: parseFloat(data.lng as string)
      })
      
      setMsg('✅ Etkinlik Başarıyla Eklendi!')
      e.target.reset() // Formu temizle
      
      // Mesajı 3 saniye sonra kaldır
      setTimeout(() => setMsg(''), 3000)

    } catch (error) {
      setMsg('❌ Bir hata oluştu.')
      console.error(error)
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl border border-gray-200">
        <div className="p-8">
          <div className="uppercase tracking-wide text-sm text-indigo-500 font-bold mb-1">Yönetici Paneli</div>
          <h1 className="block mt-1 text-lg leading-tight font-black text-black hover:underline">Yeni Etkinlik Oluştur</h1>
          
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            
            {/* Başlık */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Etkinlik Başlığı</label>
              <input name="title" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-black focus:border-black sm:text-sm" placeholder="Örn: Büyük Ev Ablukada Konseri" />
            </div>

            {/* Açıklama (YENİ EKLENDİ) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Açıklama</label>
              <textarea 
                name="description" 
                required 
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-black focus:border-black sm:text-sm resize-none" 
                placeholder="Etkinlik hakkında detaylı bilgi (Line-up, yaş sınırı vb.)" 
              />
            </div>

            {/* Mekan */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Mekan Adı</label>
              <input name="venue" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-black focus:border-black sm:text-sm" placeholder="Örn: Zorlu PSM" />
            </div>

            {/* Kategori ve Fiyat Yan Yana */}
            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700">Kategori</label>
                <select name="category" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-black focus:border-black sm:text-sm bg-white">
                  <option>Müzik</option>
                  <option>Tiyatro</option>
                  <option>Sanat</option>
                  <option>Stand-up</option>
                  <option>Spor</option>
                  <option>Sinema</option>
                  <option>Atölye</option>
                </select>
              </div>
              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700">Fiyat</label>
                <input name="price" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-black focus:border-black sm:text-sm" placeholder="Örn: 250 TL" />
              </div>
            </div>

            {/* Tarih ve Saat Yan Yana */}
            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700">Tarih</label>
                <input type="date" name="date" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-black focus:border-black sm:text-sm" />
              </div>
              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700">Saat</label>
                <input type="time" name="time" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-black focus:border-black sm:text-sm" />
              </div>
            </div>

            {/* Konum Alanı */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                📍 Google Maps Koordinatları
              </p>
              <div className="flex gap-4">
                <div className="w-1/2">
                  <input name="lat" required placeholder="Enlem (41.xxx)" className="block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm" />
                </div>
                <div className="w-1/2">
                  <input name="lng" required placeholder="Boylam (29.xxx)" className="block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm" />
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Google Maps'te bir yere sağ tıklayıp en üstteki rakamları kopyalayabilirsin.</p>
            </div>

            {/* Buton */}
            <button 
              disabled={loading} 
              className={`w-full flex justify-center py-4 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Kaydediliyor...' : 'Etkinliği Yayınla'}
            </button>

            {/* Başarı/Hata Mesajı */}
            {msg && (
              <div className={`text-center p-3 rounded-lg font-bold text-sm ${msg.includes('Hata') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                {msg}
              </div>
            )}

          </form>
        </div>
      </div>
    </div>
  )
}