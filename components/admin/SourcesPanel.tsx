'use client'

// Admin → Kaynaklar: katalog, sağlık, son çalışmalar, aç/kapat, inceleme ve kullanıcı bildirimleri.
import { useCallback, useEffect, useState } from 'react'
import { adminDb } from '@/lib/admin-db'
import { SOURCE_CATALOG, SOURCE_TYPE_LABEL, type Decision } from '@/lib/sources/catalog'
import { timeAgo } from '@/lib/utils'
import { toast } from '@/lib/toast'

interface Health { source: string; last_run_at: string | null; last_success_at: string | null; runs_7d: number; failures_7d: number; avg_duration_ms_7d: number | null }
interface Run { id: number; source: string; status: string; started_at: string; duration_ms: number | null; fetched: number; inserted: number; updated: number; unchanged: number; invalid: number; needs_review: number; errors: Record<string, number>; error_message: string | null }
interface Review { id: number; source: string; title: string; start_time: string; match_confidence: number | null; url: string | null; events: { id: number; title: string } | null }
interface Report { id: number; reason: string; note: string | null; created_at: string; events: { id: number; title: string } | null }

const DECISION_STYLE: Record<Decision, { label: string; cls: string }> = {
  integrated: { label: 'Entegre', cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  pending_permission: { label: 'İzin bekliyor', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  blocked: { label: 'Teknik engel', cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  monitor: { label: 'İzleniyor', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  unsupported: { label: 'Desteklenmiyor', cls: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
}

const REASON_LABEL: Record<string, string> = { wrong_date: 'Tarih/saat', wrong_venue: 'Mekân', wrong_price: 'Fiyat', cancelled: 'İptal/erteleme', other: 'Diğer' }

export default function SourcesPanel() {
  const [health, setHealth] = useState<Record<string, Health>>({})
  const [runs, setRuns] = useState<Run[]>([])
  const [enabled, setEnabled] = useState<Record<string, boolean>>({})
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [reviews, setReviews] = useState<Review[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [h, r, s, rv, rp] = await Promise.all([
      adminDb.from('source_health').select('*'),
      adminDb.from('source_runs').select('*').order('started_at', { ascending: false }).limit(30),
      adminDb.from('source_settings').select('source, enabled'),
      adminDb.from('event_sources').select('id, source, title, start_time, match_confidence, url, events(id, title)').eq('needs_review', true).limit(50),
      adminDb.from('event_reports').select('id, reason, note, created_at, events(id, title)').eq('status', 'open').order('created_at', { ascending: false }).limit(50),
    ])
    const firstError = [h, r, s, rv, rp].find(x => x.error)?.error
    setError(firstError ? `${firstError.message} — 20261004 migration'ı çalıştırıldı mı?` : '')
    setHealth(Object.fromEntries(((h.data as Health[]) || []).map(x => [x.source, x])))
    setRuns((r.data as Run[]) || [])
    setEnabled(Object.fromEntries(((s.data as { source: string; enabled: boolean }[]) || []).map(x => [x.source, x.enabled])))
    setReviews((rv.data as unknown as Review[]) || [])
    setReports((rp.data as unknown as Report[]) || [])

    const integrated = SOURCE_CATALOG.filter(c => c.decision === 'integrated')
    const res = await Promise.all(integrated.map(c => adminDb.from('event_sources').select('id', { count: 'exact', head: true }).eq('source', c.id)))
    setCounts(Object.fromEntries(integrated.map((c, i) => [c.id, res[i].count || 0])))
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta veri çekme
  useEffect(() => { load() }, [load])

  const toggle = async (source: string) => {
    const next = !(enabled[source] ?? true)
    const { error } = await adminDb.from('source_settings').upsert({ source, enabled: next, updated_at: new Date().toISOString() })
    if (error) return toast(`Kaydedilemedi: ${error.message}`, 'error')
    setEnabled(prev => ({ ...prev, [source]: next }))
    toast(next ? 'Kaynak açıldı; bir sonraki alımda çalışacak.' : 'Kaynak kapatıldı.', 'success')
  }

  const resolveReview = async (id: number) => {
    await adminDb.from('event_sources').update({ needs_review: false }).eq('id', id)
    setReviews(prev => prev.filter(r => r.id !== id))
  }

  const resolveReport = async (id: number, status: 'resolved' | 'dismissed') => {
    await adminDb.from('event_reports').update({ status }).eq('id', id)
    setReports(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm font-bold">{error}</div>}

      <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">ETKİNLİK KAYNAKLARI</h2>
          <button onClick={load} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700">Yenile</button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Otomatik alım GitHub Actions ile 3 saatte bir çalışır. Yalnızca &quot;Entegre&quot; kaynaklar çalıştırılır; diğerleri izin veya erişim durumu nedeniyle kapalıdır.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-gray-400 border-b dark:border-gray-700">
                <th className="py-2 pr-3">Kaynak</th><th className="py-2 pr-3">Durum</th><th className="py-2 pr-3">Son başarılı alım</th>
                <th className="py-2 pr-3">7 gün hata</th><th className="py-2 pr-3">Kayıt</th><th className="py-2 pr-3">Aç/Kapat</th>
              </tr>
            </thead>
            <tbody>
              {SOURCE_CATALOG.map(c => {
                const h = health[c.id]
                const isOn = enabled[c.id] ?? true
                return (
                  <tr key={c.id} className="border-b last:border-0 dark:border-gray-700 align-top">
                    <td className="py-2 pr-3 min-w-[220px]">
                      <a href={c.homepage} target="_blank" rel="noopener noreferrer" className="font-bold hover:underline">{c.name}</a>
                      <div className="text-[11px] text-gray-400">{SOURCE_TYPE_LABEL[c.type]} · {c.cities.join(', ')} · kontrol: {c.verifiedAt}</div>
                      <details className="text-[11px] text-gray-500 mt-1"><summary className="cursor-pointer">Gerekçe</summary>{c.reason}</details>
                    </td>
                    <td className="py-2 pr-3"><span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${DECISION_STYLE[c.decision].cls}`}>{DECISION_STYLE[c.decision].label}</span></td>
                    <td className="py-2 pr-3 text-xs">{h?.last_success_at ? timeAgo(h.last_success_at) : '—'}</td>
                    <td className="py-2 pr-3 text-xs">{h ? `${h.failures_7d}/${h.runs_7d}` : '—'}</td>
                    <td className="py-2 pr-3 text-xs tabular-nums">{c.decision === 'integrated' ? counts[c.id] ?? '…' : '—'}</td>
                    <td className="py-2 pr-3">
                      {c.decision === 'integrated' ? (
                        <button onClick={() => toggle(c.id)} aria-pressed={isOn} className={`text-xs font-bold px-3 py-1 rounded-lg ${isOn ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                          {isOn ? 'Açık' : 'Kapalı'}
                        </button>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
        <h3 className="font-black text-lg mb-3">Son alım çalışmaları</h3>
        {runs.length === 0 ? <p className="text-sm text-gray-400">Henüz çalışma kaydı yok.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-gray-400 uppercase border-b dark:border-gray-700"><th className="py-2 pr-2">Zaman</th><th className="pr-2">Kaynak</th><th className="pr-2">Sonuç</th><th className="pr-2">Okunan</th><th className="pr-2">Yeni</th><th className="pr-2">Değişen</th><th className="pr-2">Aynı</th><th className="pr-2">Geçersiz</th><th className="pr-2">Süre</th><th>Hata</th></tr></thead>
              <tbody>
                {runs.map(r => (
                  <tr key={r.id} className="border-b last:border-0 dark:border-gray-700 tabular-nums">
                    <td className="py-1.5 pr-2 whitespace-nowrap">{timeAgo(r.started_at)}</td>
                    <td className="pr-2">{r.source}</td>
                    <td className="pr-2"><span className={`font-bold ${r.status === 'success' ? 'text-green-600' : r.status === 'failed' ? 'text-red-600' : 'text-amber-600'}`}>{r.status}</span></td>
                    <td className="pr-2">{r.fetched}</td><td className="pr-2">{r.inserted}</td><td className="pr-2">{r.updated}</td><td className="pr-2">{r.unchanged}</td><td className="pr-2">{r.invalid}</td>
                    <td className="pr-2">{r.duration_ms ? `${Math.round(r.duration_ms / 1000)} sn` : '—'}</td>
                    <td className="text-red-500 max-w-xs truncate" title={r.error_message || ''}>{Object.entries(r.errors || {}).map(([k, v]) => `${k}:${v}`).join(' ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="font-black text-lg mb-1">İnceleme bekleyen eşleşmeler ({reviews.length})</h3>
          <p className="text-xs text-gray-400 mb-3">Başka kaynaktaki bir etkinliğe benziyor ama otomatik birleştirilecek kadar emin değiliz; ayrı kayıt olarak yayında.</p>
          {reviews.length === 0 ? <p className="text-sm text-gray-400">Bekleyen yok.</p> : (
            <ul className="space-y-2 text-sm">
              {reviews.map(r => (
                <li key={r.id} className="flex justify-between gap-2 border-b last:border-0 dark:border-gray-700 pb-2">
                  <span className="min-w-0">
                    <span className="font-bold">{r.title}</span> <span className="text-xs text-gray-400">({r.source}, güven %{Math.round((r.match_confidence || 0) * 100)})</span>
                  </span>
                  <button onClick={() => resolveReview(r.id)} className="text-xs font-bold text-brand shrink-0">İncelendi</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="font-black text-lg mb-3">Kullanıcı bildirimleri ({reports.length})</h3>
          {reports.length === 0 ? <p className="text-sm text-gray-400">Açık bildirim yok.</p> : (
            <ul className="space-y-2 text-sm">
              {reports.map(r => (
                <li key={r.id} className="border-b last:border-0 dark:border-gray-700 pb-2">
                  <div className="flex justify-between gap-2">
                    <a href={r.events ? `/etkinlik/${r.events.id}` : '#'} target="_blank" rel="noopener noreferrer" className="font-bold hover:underline min-w-0 truncate">{r.events?.title || 'Silinmiş etkinlik'}</a>
                    <span className="text-xs text-gray-400 shrink-0">{timeAgo(r.created_at)}</span>
                  </div>
                  <div className="text-xs text-gray-500">{REASON_LABEL[r.reason] || r.reason}{r.note ? `: ${r.note}` : ''}</div>
                  <div className="flex gap-3 mt-1">
                    <button onClick={() => resolveReport(r.id, 'resolved')} className="text-xs font-bold text-green-600">Düzeltildi</button>
                    <button onClick={() => resolveReport(r.id, 'dismissed')} className="text-xs font-bold text-gray-400">Yoksay</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
