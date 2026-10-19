'use client'

import Link from 'next/link'
import { Globe, Navigation, Store, X } from 'lucide-react'
import type { Event, SelectableEvent } from '@/lib/types'
import { PRESET_LOCATIONS, formatDateRange } from '@/lib/home'

export interface VenueFormState {
  venue_name: string
  contact_name: string
  phone: string
  email: string
  message: string
}

export interface SuggestFormState {
  title: string
  event_url: string
  notes: string
  contact_email: string
}

interface SubmissionModalsProps {
  showLocModal: boolean
  setShowLocModal: (v: boolean) => void
  handleSelectLocation: (loc: typeof PRESET_LOCATIONS[number]) => void
  handleLocate: () => void

  showVenueModal: boolean
  setShowVenueModal: (v: boolean) => void
  venueForm: VenueFormState
  setVenueForm: (v: VenueFormState) => void
  venueKvkk: boolean
  setVenueKvkk: (v: boolean) => void
  handleVenueSubmit: (e: React.FormEvent) => void

  showSuggestModal: boolean
  setShowSuggestModal: (v: boolean) => void
  suggestForm: SuggestFormState
  setSuggestForm: (v: SuggestFormState) => void
  handleSuggestSubmit: (e: React.FormEvent) => void

  honeypot: string
  setHoneypot: (v: string) => void

  showVenueEventsModal: string | null
  setShowVenueEventsModal: (v: string | null) => void
  allEvents: Event[]
  onEventSelect: (event: SelectableEvent | null) => void
}

export default function SubmissionModals({
  showLocModal,
  setShowLocModal,
  handleSelectLocation,
  handleLocate,
  showVenueModal,
  setShowVenueModal,
  venueForm,
  setVenueForm,
  venueKvkk,
  setVenueKvkk,
  handleVenueSubmit,
  showSuggestModal,
  setShowSuggestModal,
  suggestForm,
  setSuggestForm,
  handleSuggestSubmit,
  honeypot,
  setHoneypot,
  showVenueEventsModal,
  setShowVenueEventsModal,
  allEvents,
  onEventSelect,
}: SubmissionModalsProps) {
  return (
    <>
      {/* LOC MODAL */}
      {showLocModal && (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><Globe size={18} /> Konum Değiştir</h3>
              <button onClick={() => setShowLocModal(false)}><X size={20} className="text-gray-500" /></button>
            </div>
            <div className="p-2 max-h-[60vh] overflow-y-auto">
              {PRESET_LOCATIONS.map((loc) => (
                <button key={loc.name} onClick={() => handleSelectLocation(loc)} className="w-full text-left p-3 hover:bg-brand/5 dark:hover:bg-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-50 dark:border-gray-700 last:border-0 transition-colors">{loc.name}</button>
              ))}
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700">
              <button onClick={() => { handleLocate(); setShowLocModal(false); }} className="w-full bg-black dark:bg-white dark:text-black text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"><Navigation size={16} /> Konumumu Bul (GPS)</button>
            </div>
          </div>
        </div>
      )}

      {/* VENUE APPLY MODAL */}
      {showVenueModal && (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b dark:border-gray-700 bg-brand text-white text-center relative">
              <h3 className="font-black text-xl tracking-tight">MEKANINI EKLE</h3>
              <p className="text-xs opacity-90">18-23 Ailesine Katılın</p>
              <button onClick={() => setShowVenueModal(false)} className="absolute top-4 right-4 text-white/80 hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleVenueSubmit} className="space-y-3">
                <input required placeholder="Mekan Adı" className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600" value={venueForm.venue_name} onChange={e => setVenueForm({ ...venueForm, venue_name: e.target.value })} />
                <input required placeholder="Yetkili Kişi" className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600" value={venueForm.contact_name} onChange={e => setVenueForm({ ...venueForm, contact_name: e.target.value })} />
                <div className="flex gap-2">
                  <input required placeholder="Telefon" className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600" value={venueForm.phone} onChange={e => setVenueForm({ ...venueForm, phone: e.target.value })} />
                  <input required type="email" placeholder="E-mail" className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600" value={venueForm.email} onChange={e => setVenueForm({ ...venueForm, email: e.target.value })} />
                </div>
                <textarea placeholder="Mesajınız..." className="w-full border p-3 rounded-lg h-20 resize-none dark:bg-gray-700 dark:border-gray-600" value={venueForm.message} onChange={e => setVenueForm({ ...venueForm, message: e.target.value })} />
                <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={honeypot} onChange={e => setHoneypot(e.target.value)} />
                <label className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <input type="checkbox" required checked={venueKvkk} onChange={e => setVenueKvkk(e.target.checked)} className="mt-0.5" />
                  <span><Link href="/kvkk" target="_blank" className="underline font-bold">KVKK Aydınlatma Metni</Link>&apos;ni okudum; iletişim bilgilerimin başvurumun değerlendirilmesi için işlenmesini kabul ediyorum.</span>
                </label>
                <button className="w-full bg-black text-white dark:bg-white dark:text-black py-3 rounded-xl font-bold">Başvuru Gönder</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* SUGGEST EVENT MODAL */}
      {showSuggestModal && (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b dark:border-gray-700 bg-brand text-white text-center relative">
              <h3 className="font-black text-xl tracking-tight">ETKİNLİK ÖNER</h3>
              <p className="text-xs opacity-90">Kaçırdığımız bir etkinlik mi var?</p>
              <button onClick={() => setShowSuggestModal(false)} className="absolute top-4 right-4 text-white/80 hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSuggestSubmit} className="space-y-3">
                <input required placeholder="Etkinlik Adı *" className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600" value={suggestForm.title} onChange={e => setSuggestForm({ ...suggestForm, title: e.target.value })} />
                <input placeholder="Etkinlik Linki (bilet sitesi vb.)" className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600" value={suggestForm.event_url} onChange={e => setSuggestForm({ ...suggestForm, event_url: e.target.value })} />
                <textarea placeholder="Notlar (tarih, mekan vb.)" className="w-full border p-3 rounded-lg h-20 resize-none dark:bg-gray-700 dark:border-gray-600" value={suggestForm.notes} onChange={e => setSuggestForm({ ...suggestForm, notes: e.target.value })} />
                <input type="email" placeholder="E-mail (opsiyonel)" className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:border-gray-600" value={suggestForm.contact_email} onChange={e => setSuggestForm({ ...suggestForm, contact_email: e.target.value })} />
                <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={honeypot} onChange={e => setHoneypot(e.target.value)} />
                <p className="text-[11px] text-gray-500">E-postanız yalnızca öneriniz hakkında dönüş için kullanılır. <Link href="/kvkk" target="_blank" className="underline">KVKK</Link></p>
                <button className="w-full bg-black text-white dark:bg-white dark:text-black py-3 rounded-xl font-bold">Etkinlik Öner</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* VENUE EVENTS MODAL */}
      {showVenueEventsModal && (
        <div className="fixed inset-0 z-[2200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center gap-2 font-bold"><Store size={18} /> Mekandaki Diğer Etkinlikler</div>
              <button onClick={() => setShowVenueEventsModal(null)}><X size={20} /></button>
            </div>
            <div className="p-4 overflow-y-auto space-y-3 bg-gray-50 dark:bg-black/20 flex-1">
              {allEvents.filter(e => e.venue_name === showVenueEventsModal).length === 0 && <div className="text-gray-500 text-center">Başka etkinlik bulunamadı.</div>}
              {allEvents.filter(e => e.venue_name === showVenueEventsModal).map(e => (
                <div key={e.id} onClick={() => { onEventSelect(e); setShowVenueEventsModal(null); }} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 flex gap-3 cursor-pointer hover:border-brand/50 transition">
                  {e.image_url && <img src={e.image_url} alt={e.title} className="w-16 h-16 object-cover rounded-lg bg-gray-200" />}
                  <div>
                    <div className="font-bold text-sm leading-tight">{e.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{formatDateRange(e.start_time)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
