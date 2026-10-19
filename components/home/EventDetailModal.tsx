'use client'

import {
  Ban,
  Calendar,
  CalendarPlus,
  Check,
  Footprints,
  Heart,
  Info,
  Instagram,
  MapPin,
  MessageCircle,
  Navigation,
  Plus,
  Share2,
  Sparkles,
  Star,
  Ticket,
  Twitter,
  X,
} from 'lucide-react'
import SourceLine from '@/components/SourceLine'
import ReportButton from '@/components/ReportButton'
import type { Event, MaybeEvent, Review, SelectableEvent } from '@/lib/types'
import type { User as AuthUser } from '@supabase/supabase-js'
import { formatPrice } from '@/lib/utils'
import { formatDateRange } from '@/lib/home'

interface EventDetailModalProps {
  selectedEvent: SelectableEvent | null
  onClose: () => void
  followedVenues: string[]
  toggleFollow: (venueName: string) => void
  setShowVenueEventsModal: (venueName: string | null) => void
  handleShare: (event: Event, platform?: 'whatsapp' | 'twitter' | 'instagram') => void
  addToCalendar: (event: Event, type: 'google' | 'ical') => void
  user: AuthUser | null
  eventReviews: Review[]
  showReviewForm: boolean
  setShowReviewForm: (v: boolean) => void
  reviewForm: { rating: number; comment: string }
  setReviewForm: (v: { rating: number; comment: string }) => void
  handleSubmitReview: () => void
  submittingReview: boolean
  favorites: number[]
  toggleFavorite: (e: MaybeEvent, eventId: number, category: string) => void
  openTicket: (e: MaybeEvent, url?: string) => void
  openDirections: (e: MaybeEvent, event: Event) => void
}

export default function EventDetailModal({
  selectedEvent,
  onClose,
  followedVenues,
  toggleFollow,
  setShowVenueEventsModal,
  handleShare,
  addToCalendar,
  user,
  eventReviews,
  showReviewForm,
  setShowReviewForm,
  reviewForm,
  setReviewForm,
  handleSubmitReview,
  submittingReview,
  favorites,
  toggleFavorite,
  openTicket,
  openDirections,
}: EventDetailModalProps) {
  if (!selectedEvent) return null

  return (
    <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 z-[1] bg-black/60" onClick={onClose}></div>
      <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-900 w-full md:w-[500px] md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative z-[2]">
        <button onClick={onClose} className="absolute top-4 right-4 z-[3] bg-black/50 hover:bg-black text-white p-2 rounded-full transition"><X size={24} /></button>

        <div className="h-64 md:h-72 bg-brand relative shrink-0 flex items-center justify-center overflow-hidden">
          {selectedEvent.image_url ? (
            <img src={selectedEvent.image_url} alt={selectedEvent.title} className={`w-full h-full object-cover ${selectedEvent.sold_out ? 'grayscale' : ''}`} />
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full p-8 gap-4 bg-brand">
              <div className="text-white font-black text-5xl tracking-tighter opacity-50">18-23</div>
              <div className="w-full h-[1px] bg-white/20"></div>
              <div className="flex items-center gap-3 text-white w-full">
                <div className="bg-white/10 p-2 rounded-lg text-white"><MapPin size={20} /></div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-white/60 uppercase flex items-center gap-2">
                    Mekan
                    <button onClick={(e) => { e.stopPropagation(); toggleFollow(selectedEvent.venue_name); }} className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition flex items-center gap-1 ${followedVenues.includes(selectedEvent.venue_name) ? 'bg-white text-brand' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                      {followedVenues.includes(selectedEvent.venue_name) ? <Check size={10} /> : <Plus size={10} />}
                      {followedVenues.includes(selectedEvent.venue_name) ? 'Takip Ediliyor' : 'Takip Et'}
                    </button>
                  </div>
                  <div className="font-bold text-lg text-white leading-tight">{selectedEvent.venue_name}</div>
                  {selectedEvent.address && <div className="text-xs text-white/80 mt-1 leading-tight">{selectedEvent.address}</div>}
                </div>
                <button onClick={(e) => { e.stopPropagation(); setShowVenueEventsModal(selectedEvent.venue_name); }} className="text-xs bg-white/10 text-white px-2 py-1 rounded font-bold hover:bg-white/20">Diğer Etkinlikler</button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <div className="flex justify-between items-start mb-2">
              <h2 className="font-black text-2xl text-gray-900 dark:text-white leading-tight">{selectedEvent.title}</h2>
              <span className="text-sm font-bold text-brand bg-brand/10 px-2 py-1 rounded shrink-0 ml-2">{formatPrice(selectedEvent.price)}</span>
            </div>
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <Calendar size={14} /> {formatDateRange(selectedEvent.start_time, selectedEvent.end_time)}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <SourceLine event={selectedEvent} />
              <ReportButton key={selectedEvent.id} eventId={selectedEvent.id} />
            </div>
          </div>

          {/* PERSONALIZED MATCH & DISTANCE INSIGHT */}
          {selectedEvent.matchScore && (
            <div className="bg-gradient-to-r from-red-950/40 to-purple-950/30 border border-brand/40 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-black text-brand flex items-center gap-1.5">
                  <Sparkles size={15} /> 🎯 %{selectedEvent.matchScore} Seninle Uyumlu
                </span>
                {selectedEvent.walkMinutes && (
                  <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                    <Footprints size={13} className="text-emerald-400" /> ~{selectedEvent.walkMinutes} dk yürüme
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-300 font-medium leading-relaxed">
                {selectedEvent.matchReason}
              </p>
            </div>
          )}

          <div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-2">Etkinlik Hakkında</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">{selectedEvent.description || 'Açıklama bulunmuyor.'}</p>
          </div>

          {/* MULTI-TICKET PROVIDER COMPARISON */}
          {selectedEvent.ticket_sources && selectedEvent.ticket_sources.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800/80 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2.5 flex items-center gap-1.5">
                <Ticket size={14} className="text-brand" /> Bilet Sağlayıcıları ({selectedEvent.ticket_sources.length} Platform)
              </h3>
              <div className="space-y-2">
                {selectedEvent.ticket_sources.map((src, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2.5 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 text-xs">
                    <span className="font-bold text-gray-800 dark:text-gray-200 capitalize">{src.source}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-brand">{src.price}</span>
                      <a href={src.url} target="_blank" rel="noopener noreferrer" className="bg-brand text-white px-2.5 py-1 rounded font-bold hover:bg-brand-dark transition text-[11px]">
                        Seç
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedEvent.rules && (
            <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl border border-yellow-100 dark:border-yellow-900/20">
              <h3 className="font-bold text-yellow-800 dark:text-yellow-500 mb-2 flex items-center gap-2"><Info size={16} /> Good to Know / Kurallar</h3>
              <p className="text-sm text-yellow-900 dark:text-yellow-200/80 whitespace-pre-line">{selectedEvent.rules}</p>
            </div>
          )}

          {selectedEvent.ticket_details && selectedEvent.ticket_details.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2"><Ticket size={16} /> Bilet Seçenekleri</h3>
              <div className="space-y-2">
                {selectedEvent.ticket_details.map((t, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-brand">{formatPrice(t.price)}</span>
                      {t.status && <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 rounded">{t.status}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t dark:border-gray-700">
            <div className="text-xs font-bold text-gray-400 mb-2 uppercase flex items-center gap-1"><Share2 size={12} /> Paylaş</div>
            <div className="flex gap-2">
              <button onClick={() => handleShare(selectedEvent, 'whatsapp')} className="p-2 bg-[#25D366]/10 text-[#25D366] rounded-lg hover:bg-[#25D366]/20 transition"><MessageCircle size={20} /></button>
              <button onClick={() => handleShare(selectedEvent, 'instagram')} className="p-2 bg-[#E1306C]/10 text-[#E1306C] rounded-lg hover:bg-[#E1306C]/20 transition"><Instagram size={20} /></button>
              <button onClick={() => handleShare(selectedEvent, 'twitter')} className="p-2 bg-[#1DA1F2]/10 text-[#1DA1F2] rounded-lg hover:bg-[#1DA1F2]/20 transition"><Twitter size={20} /></button>
              <button onClick={() => handleShare(selectedEvent)} className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg"><Share2 size={20} /></button>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-gray-400 mb-2 uppercase flex items-center gap-1"><CalendarPlus size={12} /> Takvime Ekle</div>
            <div className="flex gap-2">
              <button onClick={() => addToCalendar(selectedEvent, 'google')} className="flex items-center gap-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-blue-100 transition">Google Calendar</button>
              <button onClick={() => addToCalendar(selectedEvent, 'ical')} className="flex items-center gap-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-gray-200 transition">Apple / iCaL (.ics)</button>
            </div>
          </div>

          {/* USER REVIEWS SECTION */}
          <div className="pt-4 border-t dark:border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <div className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                <Star size={12} /> Kullanıcı Yorumları ({eventReviews.length})
              </div>
              {user && (
                <button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="text-xs font-bold text-brand hover:text-brand-dark flex items-center gap-1"
                >
                  {showReviewForm ? 'İptal' : '+ Yorum Yap'}
                </button>
              )}
            </div>

            {/* Review Form */}
            {showReviewForm && (
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl mb-4 space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Puanınız</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          size={24}
                          className={star <= reviewForm.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Yorumunuz</label>
                  <textarea
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    placeholder="Bu etkinlik hakkında düşüncelerinizi paylaşın..."
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm resize-none h-24 dark:bg-gray-900 focus:ring-2 focus:ring-brand outline-none"
                    maxLength={500}
                  />
                  <div className="text-[10px] text-gray-400 text-right">{reviewForm.comment.length}/500</div>
                </div>
                <button
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className="w-full bg-brand text-white py-2 rounded-lg font-bold text-sm hover:bg-brand-dark transition disabled:opacity-50"
                >
                  {submittingReview ? 'Gönderiliyor...' : 'Yorumu Gönder'}
                </button>
              </div>
            )}

            {/* Reviews List */}
            {eventReviews.length > 0 ? (
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {eventReviews.map((review) => (
                  <div key={review.id} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={12}
                            className={star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {new Date(review.created_at).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{review.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-gray-400">
                Henüz yorum yapılmamış. {user ? 'İlk yorumu sen yap!' : 'Yorum yapmak için giriş yap.'}
              </div>
            )}
          </div>

          {/* DISCLAIMER */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mt-2">
            <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
              <strong>⚠️ Uyarı:</strong> 18-23, etkinlik organizatörü değildir. Detaylı bilgi ve güncel fiyatlar için lütfen bilet satış sayfasını ziyaret ediniz.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center gap-3 shrink-0 pb-8 md:pb-4">
          <button onClick={(e) => toggleFavorite(e, selectedEvent.id, selectedEvent.category)} className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition"><Heart size={24} className={favorites.includes(selectedEvent.id) ? "fill-brand text-brand" : ""} /></button>
          {selectedEvent.sold_out ? (
            <div className="flex-1 bg-gray-300 dark:bg-gray-700 text-gray-500 font-bold py-3 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"><Ban size={20} /> TÜKENDİ</div>
          ) : (
            <button onClick={(e) => openTicket(e, selectedEvent.ticket_url)} className="flex-1 bg-brand hover:bg-brand-dark text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition transform active:scale-95"><Ticket size={20} />{selectedEvent.price?.toLowerCase().includes('ücretsiz') || selectedEvent.price === '0' ? 'ÜCRETSİZ KATIL' : `BİLET AL (${formatPrice(selectedEvent.price)})`}</button>
          )}
          <button onClick={(e) => openDirections(e, selectedEvent)} className="p-3 rounded-xl bg-black dark:bg-white dark:text-black text-white hover:bg-gray-800 transition" title="Yol Tarifi"><Navigation size={24} /></button>
        </div>
      </div>
    </div>
  )
}
