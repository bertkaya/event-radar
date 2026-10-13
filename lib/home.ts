// Ana sayfanın (app/page.tsx) saf sabitleri ve yardımcıları. Durum ve arayüz içermez; bu yüzden ayrı dosyada test edilebilir.

// Demo verisi yalnızca geliştirmede ya da açıkça istendiğinde gösterilir
export const DEMO_MODE = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

// city: şehir filtresi (events.city ile eşleşir). null = tüm şehirler
export type PresetLocation = { name: string; lat: number; lng: number; zoom: number; city: string | null }
export const PRESET_LOCATIONS: PresetLocation[] = [
  { name: 'Tüm Şehirler', lat: 39.4, lng: 31.0, zoom: 6, city: null },
  { name: 'İstanbul', lat: 41.0082, lng: 28.9784, zoom: 11, city: 'İstanbul' },
  { name: 'Ankara (Tümü)', lat: 39.9208, lng: 32.8541, zoom: 12, city: 'Ankara' },
  { name: '• Çankaya / Tunalı', lat: 39.9032, lng: 32.8644, zoom: 14, city: 'Ankara' },
  { name: '• Bahçelievler', lat: 39.9215, lng: 32.8225, zoom: 15, city: 'Ankara' },
  { name: '• Kızılay', lat: 39.9208, lng: 32.8541, zoom: 15, city: 'Ankara' },
  { name: '• Ümitköy / Çayyolu', lat: 39.8914, lng: 32.7103, zoom: 13, city: 'Ankara' },
  { name: 'İzmir', lat: 38.4237, lng: 27.1428, zoom: 12, city: 'İzmir' },
]
export const DEFAULT_LOCATION = PRESET_LOCATIONS[0]
export const LOCATION_STORAGE_KEY = '1823-location'

// Katılım şekli filtresi (events.event_kind)
export type KindFilter = 'all' | 'free' | 'ticketed' | 'registration' | 'official'
export const KIND_FILTERS: { key: KindFilter; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'free', label: 'Ücretsiz' },
  { key: 'ticketed', label: 'Biletli' },
  { key: 'registration', label: 'Kayıtlı' },
  { key: 'official', label: 'Resmi kurum' },
]

export const hasCoords = (e: { lat?: number | null; lng?: number | null }) => Number.isFinite(e.lat) && Number.isFinite(e.lng) && !!e.lat && !!e.lng

// Standart Kategoriler (Admin ile uyumlu)
export const CATEGORIES = ['Müzik', 'Tiyatro', 'Stand-Up', 'Spor', 'Aile', 'Sanat', 'Eğitim', 'Festival', 'Sinema', 'Parti', 'Yeme-İçme']

// MOOD MANTIĞI (Hangi mod hangi kategorileri kapsar?)
export const MOODS: { [key: string]: string[] } = {
  'Kopmalık 🎸': ['Müzik', 'Spor'],
  'Chill & Sanat 🎨': ['Tiyatro', 'Sanat', 'Sinema'],
  'Date Night 🍷': ['Yeme-İçme', 'Müzik', 'Tiyatro'],
  'Ailece 👨‍👩‍👧‍👦': ['Çocuk', 'Workshop', 'Sinema'],
  'Kendini Geliştir 🧠': ['Workshop', 'Sanat']
}

// TARİH BİÇİMLENDİRİCİLER (Türkçe, yerel saat)
const hm = (d: Date) => d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

export const formatEuroDateTime = (dateStr: string) => {
  const d = new Date(dateStr)
  return `${d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${hm(d)}`
}

export const formatDateRange = (start: string, end?: string) => {
  const s = new Date(start)
  if (!end) return formatEuroDateTime(start)
  const e = new Date(end)
  if (s.toDateString() === e.toDateString()) {
    return `${s.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} ${hm(s)} - ${hm(e)}`
  }
  return `${s.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} - ${e.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} (${hm(s)})`
}
