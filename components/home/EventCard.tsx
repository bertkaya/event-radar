'use client'

import { Heart, MapPin } from 'lucide-react'
import SourceLine from '@/components/SourceLine'
import type { MaybeEvent, SelectableEvent } from '@/lib/types'
import type { ScoredEvent } from '@/lib/recommendation'
import { formatPrice } from '@/lib/utils'
import { formatDateRange } from '@/lib/home'

interface EventCardProps {
  event: ScoredEvent
  isFav: boolean
  onEventSelect: (event: SelectableEvent | null) => void
  toggleFavorite: (e: MaybeEvent, eventId: number, category: string) => void
}

export default function EventCard({
  event,
  isFav,
  onEventSelect,
  toggleFavorite,
}: EventCardProps) {
  const isSoldOut = event.sold_out

  return (
    <div
      onClick={() => onEventSelect(event)}
      className={`group bg-white dark:bg-gray-800 rounded-3xl cursor-pointer transition-all border border-gray-100 dark:border-gray-700 relative overflow-hidden flex flex-row md:flex-col items-stretch h-36 md:h-auto hover:shadow-xl hover:border-brand/40 outline-none ${event.is_featured ? 'ring-2 ring-yellow-400 shadow-md' : ''}`}
    >
      {/* Badges */}
      {event.is_featured && (
        <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
          ⭐ ÖNE ÇIKAN
        </div>
      )}

      {/* Recommendation Match Badge */}
      {event.matchScore && (
        <div className="absolute top-2 right-2 z-10 bg-black/75 backdrop-blur text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow border border-white/20 flex items-center gap-1">
          <span className="text-amber-400">🎯</span> %{event.matchScore} Uyum
        </div>
      )}

      {/* Image */}
      {event.image_url && (
        <div className="w-32 h-full md:w-full md:h-44 bg-brand shrink-0 relative flex items-center justify-center overflow-hidden">
          <img src={event.image_url} alt={event.title} className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${isSoldOut ? 'grayscale' : ''}`} />
          {isSoldOut && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-[10px] font-bold text-white bg-red-600 px-1 rounded">TÜKENDİ</span></div>}
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase hidden md:block">{event.category}</div>
        </div>
      )}

      {/* Content */}
      <div className="p-3 md:p-4 flex-1 min-w-0 flex flex-col justify-between space-y-1">
        <div>
          <div className="flex justify-between items-start gap-1">
            <span className="text-[10px] font-bold uppercase text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded md:hidden truncate">{event.category}</span>
            <span className="text-xs font-black text-brand bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded whitespace-nowrap ml-auto">{event.price === '0' || event.price?.toLowerCase().includes('ücretsiz') ? 'Ücretsiz' : formatPrice(event.price)}</span>
          </div>

          <h3 className="font-bold text-sm md:text-base text-gray-900 dark:text-white leading-snug line-clamp-2 mt-1 group-hover:text-brand transition-colors">
            {event.title}
          </h3>

          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-1 truncate">
            <MapPin size={12} className="text-brand shrink-0" />
            <span className="truncate">{event.venue_name}</span>
            {event.walkMinutes && (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 rounded shrink-0">
                🚶 {event.walkMinutes} dk
              </span>
            )}
          </div>

          {event.summary && (
            <div className="text-xs text-gray-600 dark:text-gray-300 font-medium mt-1.5 line-clamp-1 leading-relaxed hidden sm:block">
              ✨ {event.summary}
            </div>
          )}
        </div>

        <div className="flex justify-between items-end pt-1 border-t border-gray-100 dark:border-gray-800">
          <div className="min-w-0">
            <div className="text-[11px] text-gray-400 font-medium">{formatDateRange(event.start_time, event.end_time)}</div>
            <SourceLine event={event} compact />
          </div>
          <div className="flex items-center gap-1.5">
            {event.ticket_sources && event.ticket_sources.length > 1 && (
              <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold">
                {event.ticket_sources.length} Sağlayıcı
              </span>
            )}
            <button onClick={(e) => toggleFavorite(e, event.id, event.category)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 relative">
              <Heart size={16} className={isFav ? "fill-brand text-brand" : ""} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
