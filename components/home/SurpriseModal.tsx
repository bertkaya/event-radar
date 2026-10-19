'use client'

import { Shuffle, X } from 'lucide-react'
import type { SelectableEvent } from '@/lib/types'
import type { ScoredEvent } from '@/lib/recommendation'
import { formatPrice } from '@/lib/utils'
import { formatDateRange } from '@/lib/home'

interface SurpriseModalProps {
  show: boolean
  surpriseEvent: ScoredEvent | null
  onClose: () => void
  onPickAnother: () => void
  onEventSelect: (event: SelectableEvent | null) => void
}

export default function SurpriseModal({
  show,
  surpriseEvent,
  onClose,
  onPickAnother,
  onEventSelect,
}: SurpriseModalProps) {
  if (!show || !surpriseEvent) return null

  return (
    <div className="fixed inset-0 z-[2300] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 text-center relative flex flex-col max-h-[85vh]">
        <button onClick={onClose} className="absolute top-4 right-4 z-20 bg-black/60 hover:bg-black text-white p-2 rounded-full transition"><X size={20} /></button>

        <div className="relative h-56 bg-brand overflow-hidden shrink-0">
          {surpriseEvent.image_url ? (
            <img src={surpriseEvent.image_url} alt={surpriseEvent.title} className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full text-white font-black text-3xl">18-23 SÜRPRİZİ</div>
          )}
          <div className="absolute top-3 left-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
            🎲 BU AKŞAMIN SEÇİMİ
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center text-xs font-black text-white bg-black/60 backdrop-blur px-3 py-1.5 rounded-xl">
            <span>{surpriseEvent.category} • {surpriseEvent.ai_mood || 'Özel Seçim'}</span>
            <span className="text-amber-300">🎯 %{surpriseEvent.matchScore} Uyumlu</span>
          </div>
        </div>

        <div className="p-6 space-y-4 flex-1 overflow-y-auto text-left">
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight">{surpriseEvent.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">📍 {surpriseEvent.venue_name}</p>
            <p className="text-xs text-brand font-bold mt-1">🕒 {formatDateRange(surpriseEvent.start_time, surpriseEvent.end_time)}</p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            ✨ {surpriseEvent.summary || surpriseEvent.description || 'Akşamını renklendirecek heyecan dolu bir etkinlik!'}
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-sm font-black text-brand bg-brand/10 px-3 py-1 rounded-lg">{formatPrice(surpriseEvent.price)}</span>
            <div className="flex gap-2">
              <button
                onClick={onPickAnother}
                className="px-3 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-200 transition flex items-center gap-1"
              >
                <Shuffle size={14} /> Başka Seç
              </button>
              <button
                onClick={() => {
                  onClose()
                  onEventSelect(surpriseEvent)
                }}
                className="px-4 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-black shadow-lg transition"
              >
                İncele &amp; Katıl →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
