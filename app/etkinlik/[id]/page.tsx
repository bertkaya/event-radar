import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { Calendar, MapPin, Ticket, ArrowLeft, Map as MapIcon } from 'lucide-react'
import { getSupabasePublic } from '@/lib/supabase-server'
import { SITE_URL, eventUrl } from '@/lib/site'
import { formatPrice } from '@/lib/utils'
import type { Event } from '@/lib/types'

export const revalidate = 300 // 5 dk ISR

const TZ = 'Europe/Istanbul'

const getEvent = cache(async (id: string): Promise<Event | null> => {
  if (!/^\d+$/.test(id)) return null
  const supabase = getSupabasePublic()
  if (!supabase) return null
  const { data } = await supabase
    .from('events')
    .select('*, organizers(name, logo_url)')
    .eq('id', Number(id))
    .eq('is_approved', true)
    .maybeSingle()
  return data as Event | null
})

function formatWhen(start: string, end?: string | null) {
  const s = new Date(start)
  const date = s.toLocaleDateString('tr-TR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const time = s.toLocaleTimeString('tr-TR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
  const endTime = end ? ' – ' + new Date(end).toLocaleTimeString('tr-TR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }) : ''
  return `${date}, ${time}${endTime}`
}

// Server component'te render başına bir kez hesaplanır (ISR ile 5 dk'da bir yenilenir)
function hasEnded(event: Event): boolean {
  return new Date(event.end_time || event.start_time).getTime() < Date.now()
}

const excerpt = (text: string | undefined, n = 160) => {
  const t = (text || '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const event = await getEvent(id)
  if (!event) return { title: 'Etkinlik bulunamadı | 18-23' }

  const title = `${event.title} — ${event.venue_name}`
  const description = excerpt(event.summary || event.description) || `${formatWhen(event.start_time, event.end_time)} · ${event.venue_name}`
  const images = event.image_url ? [{ url: event.image_url }] : undefined
  return {
    title: `${title} | 18-23`,
    description,
    alternates: { canonical: eventUrl(event.id) },
    openGraph: { type: 'website', url: eventUrl(event.id), title, description, images, siteName: '18-23', locale: 'tr_TR' },
    twitter: { card: images ? 'summary_large_image' : 'summary', title, description, images: event.image_url ? [event.image_url] : undefined },
  }
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await getEvent(id)
  if (!event) notFound()

  const isPast = hasEnded(event)
  const directionsUrl = event.maps_url
    || (event.lat && event.lng ? `https://www.google.com/maps/dir/?api=1&destination=${event.lat},${event.lng}` : null)
    || (event.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}` : null)
  const rules = (event.rules || '').split('\n').map(r => r.trim()).filter(Boolean)
  const ticketSources = (event.ticket_sources || []).filter(s => s.url)

  // Google zengin sonuç (Event rich result)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    startDate: event.start_time,
    ...(event.end_time ? { endDate: event.end_time } : {}),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.venue_name,
      address: event.address || event.venue_name,
      ...(event.lat && event.lng ? { geo: { '@type': 'GeoCoordinates', latitude: event.lat, longitude: event.lng } } : {}),
    },
    ...(event.image_url ? { image: [event.image_url] } : {}),
    description: excerpt(event.summary || event.description, 500),
    ...(event.ticket_url
      ? {
          offers: {
            '@type': 'Offer',
            url: event.ticket_url,
            ...(event.min_price != null ? { price: event.min_price, priceCurrency: 'TRY' } : {}),
            availability: event.sold_out ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
          },
        }
      : {}),
    ...(event.organizers?.name ? { organizer: { '@type': 'Organization', name: event.organizers.name } } : {}),
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      <header className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-brand">
          <ArrowLeft size={18} /> Tüm etkinlikler
        </Link>
        <Link href="/" className="font-black text-brand tracking-tighter text-xl">18-23</Link>
      </header>

      <article className="max-w-3xl mx-auto px-4 pb-16">
        <div className="rounded-3xl overflow-hidden bg-brand aspect-[16/9] relative">
          {event.image_url ? (
            // Görseller bilet sitelerinden geliyor; next/image için remotePatterns listesi tutmamak adına düz <img>
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.image_url} alt={event.title} className={`w-full h-full object-cover ${event.sold_out || isPast ? 'grayscale' : ''}`} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/60 font-black text-6xl tracking-tighter">18-23</div>
          )}
          {event.sold_out && <span className="absolute top-4 left-4 bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full">TÜKENDİ</span>}
          {isPast && <span className="absolute top-4 left-4 bg-gray-800 text-white text-xs font-black px-3 py-1 rounded-full">SONA ERDİ</span>}
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            {event.category && <span className="bg-brand/10 text-brand px-2.5 py-1 rounded-full">{event.category}</span>}
            {event.ai_mood && <span className="bg-gray-200 dark:bg-gray-800 px-2.5 py-1 rounded-full">{event.ai_mood}</span>}
          </div>
          <h1 className="text-3xl md:text-4xl font-black leading-tight">{event.title}</h1>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex gap-3 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
              <Calendar className="text-brand shrink-0" size={20} />
              <div className="text-sm font-medium">{formatWhen(event.start_time, event.end_time)}</div>
            </div>
            <div className="flex gap-3 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
              <MapPin className="text-brand shrink-0" size={20} />
              <div className="text-sm">
                <div className="font-bold">{event.venue_name}</div>
                {event.address && <div className="text-gray-500 text-xs mt-0.5">{event.address}</div>}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {event.ticket_url && !isPast && (
              <a href={event.ticket_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold px-5 py-3 rounded-xl">
                <Ticket size={18} /> Bilet Al {event.price ? `· ${formatPrice(event.price)}` : ''}
              </a>
            )}
            {directionsUrl && (
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold px-5 py-3 rounded-xl">
                <MapPin size={18} /> Yol Tarifi
              </a>
            )}
            <Link href={`/?event=${event.id}`} className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold px-5 py-3 rounded-xl">
              <MapIcon size={18} /> Haritada Gör
            </Link>
          </div>

          {ticketSources.length > 1 && (
            <section className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
              <h2 className="font-bold mb-2 text-sm">Bilet satış noktaları</h2>
              <ul className="space-y-2">
                {ticketSources.map(s => (
                  <li key={s.url} className="flex justify-between items-center text-sm">
                    <span className="capitalize">{s.source}</span>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-bold text-brand hover:underline">{s.price ? formatPrice(s.price) : 'Siteye git'} →</a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(event.summary || event.description) && (
            <section className="prose-sm max-w-none">
              <h2 className="font-bold text-lg mb-2">Etkinlik hakkında</h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">{event.description || event.summary}</p>
            </section>
          )}

          {rules.length > 0 && (
            <section>
              <h2 className="font-bold text-lg mb-2">Bilmeniz gerekenler</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                {rules.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </section>
          )}

          <p className="text-[11px] text-gray-400 pt-6">
            Etkinlik bilgileri bilet satış sitelerinden derlenmiştir; güncel bilgi için satış sayfasını kontrol edin. · <a href={SITE_URL} className="underline">18-23</a>
          </p>
        </div>
      </article>
    </main>
  )
}
