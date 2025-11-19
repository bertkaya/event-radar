// app/admin/page.tsx
'use client'
import { useState } from 'react'
import { addLocalEvent } from '@/lib/storage' // Bizim motor

export default function Admin() {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.target)
    const data = Object.fromEntries(formData)

    // Yerel Hafızaya Ekle
    try {
      addLocalEvent({
        title: data.title,
        venue_name: data.venue,
        category: data.category,
        price: data.price,
        start_time: data.date + 'T' + data.time,
        lat: parseFloat(data.lat as string),
        lng: parseFloat(data.lng as string)
      })
      
      setMsg('✅ Etkinlik Eklendi! (Tarayıcı hafızasına kaydedildi)')
      e.target.reset()
    } catch (error) {
      setMsg('Hata oluştu.')
    }
    
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-md mx-auto bg-white min-h-screen font-sans">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Etkinlik Ekle (Offline Mod)</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-bold mb-1">Etkinlik Adı</label>
          <input name="title" required className="w-full border p-3 rounded-lg bg-gray-50" placeholder="Örn: Rock Konseri" />
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">Mekan</label>
          <input name="venue" required className="w-full border p-3 rounded-lg bg-gray-50" placeholder="Örn: Jolly Joker" />
        </div>

        <div className="flex gap-2">
          <select name="category" className="w-1/2 border p-3 rounded-lg bg-gray-50">
            <option>Müzik</option>
            <option>Tiyatro</option>
            <option>Sanat</option>
            <option>Stand-up</option>
          </select>
          <input name="price" required className="w-1/2 border p-3 rounded-lg bg-gray-50" placeholder="Fiyat" />
        </div>

        <div className="flex gap-2">
          <input type="date" name="date" required className="w-1/2 border p-3 rounded-lg bg-gray-50" />
          <input type="time" name="time" required className="w-1/2 border p-3 rounded-lg bg-gray-50" />
        </div>

        <div className="bg-orange-50 p-3 rounded-lg text-sm border border-orange-100">
          <p className="mb-2 font-bold text-orange-800">📍 Koordinatlar</p>
          <div className="flex gap-2">
            <input name="lat" required placeholder="Enlem (41.0...)" className="w-1/2 border p-2 rounded" />
            <input name="lng" required placeholder="Boylam (29.0...)" className="w-1/2 border p-2 rounded" />
          </div>
        </div>

        <button disabled={loading} className="w-full bg-black text-white p-4 rounded-lg font-bold text-lg hover:bg-gray-800 transition">
          {loading ? 'Ekleniyor...' : 'Listeye Ekle'}
        </button>

        {msg && <p className="text-center font-bold mt-4 text-green-600">{msg}</p>}
      </form>
    </div>
  )
}