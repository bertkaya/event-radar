'use client'

// Kullanıcının yanlış tarih/mekân/fiyat veya iptal bildirmesi. /api/submit üzerinden event_reports'a yazılır.
import { useState } from 'react'
import { toast } from '@/lib/toast'

const REASONS = [
  { value: 'wrong_date', label: 'Tarih/saat yanlış' },
  { value: 'wrong_venue', label: 'Mekân yanlış' },
  { value: 'wrong_price', label: 'Fiyat yanlış' },
  { value: 'cancelled', label: 'Etkinlik iptal/ertelendi' },
  { value: 'other', label: 'Diğer' },
]

export default function ReportButton({ eventId }: { eventId: number }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('wrong_date')
  const [note, setNote] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [sending, setSending] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'event_report', event_id: eventId, reason, note, website }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        toast('Bildirimin alındı, teşekkürler.', 'success')
        setOpen(false)
        setNote('')
      } else {
        toast(json.error || 'Gönderilemedi.', 'error')
      }
    } finally {
      setSending(false)
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-[11px] font-bold text-gray-400 hover:text-brand underline">
        Yanlış bilgi bildir
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm">
      <label htmlFor={`report-reason-${eventId}`} className="block text-xs font-bold text-gray-500">Ne yanlış?</label>
      <select id={`report-reason-${eventId}`} value={reason} onChange={e => setReason(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg p-2">
        {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
      <textarea
        id={`report-note-${eventId}`}
        aria-label="Açıklama (isteğe bağlı)"
        placeholder="Doğrusu nedir? (isteğe bağlı)"
        maxLength={500}
        value={note}
        onChange={e => setNote(e.target.value)}
        className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg p-2 h-16 resize-none"
      />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={website} onChange={e => setWebsite(e.target.value)} />
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs font-bold text-gray-500">Vazgeç</button>
        <button disabled={sending} className="px-3 py-1.5 text-xs font-bold bg-brand text-white rounded-lg disabled:opacity-50">{sending ? 'Gönderiliyor...' : 'Gönder'}</button>
      </div>
    </form>
  )
}
