// scripts/ingest/run.ts
// Etkinlik alımı: npx tsx scripts/ingest/run.ts [kaynak...] [--dry-run]
//   --dry-run  Veritabanına yazmaz, kaynakları okuyup özet basar.
// Kaynaklar admin panelindeki "Kaynaklar" sekmesinden (source_settings) açılıp kapatılabilir.
import { randomUUID } from 'crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { HttpClient } from './http'
import { Geocoder } from './geocode'
import { storeEvents, deactivateMissing, markPast } from './store'
import { SourceError, type SourceAdapter, type ErrorClass } from './types'
import { ADAPTERS } from './adapters'
import { getCatalogEntry } from '../../lib/sources/catalog'

dotenv.config({ path: '.env.local', quiet: true })

const LOCK_NAME = 'events-ingest'
const LOCK_TTL_SECONDS = 30 * 60
const SOURCE_TIMEOUT_MS = 10 * 60 * 1000 // tek kaynak en fazla 10 dk

interface Settings { enabled: boolean; min_interval_ms: number | null; timeout_ms: number | null }

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<T>((_, rej) => {
    timer = setTimeout(() => rej(new SourceError('network', `${label}: ${ms / 1000}s içinde bitmedi`)), ms)
  })
  // Zamanlayıcı temizlenmezse süreç iş bittikten sonra 10 dk açık kalır
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer))
}

async function loadSettings(sb: SupabaseClient | null): Promise<Map<string, Settings>> {
  const map = new Map<string, Settings>()
  if (!sb) return map
  const { data, error } = await sb.from('source_settings').select('source, enabled, min_interval_ms, timeout_ms')
  if (error) console.warn('source_settings okunamadı (migration çalıştırıldı mı?):', error.message)
  for (const s of data || []) map.set(s.source, s)
  return map
}

async function runSource(adapter: SourceAdapter, sb: SupabaseClient | null, settings: Settings | undefined, geocoder: Geocoder | null, runId: string) {
  const startedAt = new Date()
  const log = (m: string) => console.log(`[${adapter.id}] ${m}`)
  const errors: Partial<Record<ErrorClass, number>> = {}
  let status: 'success' | 'partial' | 'failed' | 'skipped' = 'success'
  let errorMessage: string | null = null
  const counts = { fetched: 0, inserted: 0, updated: 0, unchanged: 0, invalid: 0, needs_review: 0 }

  if (settings && !settings.enabled) {
    status = 'skipped'
    log('admin panelinden kapatılmış, atlanıyor')
  } else {
    const http = new HttpClient({
      minIntervalMs: settings?.min_interval_ms ?? adapter.defaultMinIntervalMs,
      timeoutMs: settings?.timeout_ms ?? adapter.defaultTimeoutMs,
    })
    try {
      const result = await withTimeout(adapter.fetchEvents(http, log), SOURCE_TIMEOUT_MS, adapter.id)
      Object.assign(errors, result.errors)
      counts.fetched = result.fetched
      counts.invalid = result.invalid
      log(`${result.fetched} kayıt okundu, ${result.events.length} geçerli, ${http.requests} istek`)

      if (sb && geocoder) {
        const stats = await storeEvents(sb, adapter.id, adapter.type, result.events, geocoder, log)
        counts.inserted = stats.inserted
        counts.updated = stats.updated
        counts.unchanged = stats.unchanged
        counts.invalid += stats.invalid
        counts.needs_review = stats.needsReview
        if (result.complete) await deactivateMissing(sb, adapter.id, log)
      } else {
        for (const e of result.events.slice(0, 3)) log(`örnek: ${e.title} | ${e.startTime} | ${e.venueName ?? '-'} | ${e.city}`)
      }
      if (!result.complete || Object.keys(result.errors).length) status = 'partial'
      log(`yeni ${counts.inserted}, güncellenen ${counts.updated}, değişmeyen ${counts.unchanged}, geçersiz ${counts.invalid}, inceleme ${counts.needs_review}`)
    } catch (e) {
      status = 'failed'
      const kind: ErrorClass = e instanceof SourceError ? e.kind : 'invalid_data'
      errors[kind] = (errors[kind] || 0) + 1
      errorMessage = (e as Error).message
      log(`BAŞARISIZ (${kind}): ${errorMessage}`)
    }
  }

  const finishedAt = new Date()
  if (sb) {
    await sb.from('source_runs').insert({
      run_id: runId,
      source: adapter.id,
      status,
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      duration_ms: finishedAt.getTime() - startedAt.getTime(),
      ...counts,
      errors,
      error_message: errorMessage,
    })
  }
  return status
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const only = args.filter(a => !a.startsWith('--'))
  const adapters = only.length ? ADAPTERS.filter(a => only.includes(a.id)) : ADAPTERS
  if (only.length && adapters.length !== only.length) {
    console.error('Bilinmeyen kaynak. Kullanılabilir:', ADAPTERS.map(a => a.id).join(', '))
    process.exit(2)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!dryRun && (!url || !key)) {
    // Sessizce "simülasyon" yapıp başarılı görünmek yerine açıkça hata ver
    console.error('NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli (yalnızca okumak için --dry-run).')
    process.exit(1)
  }
  const sb = dryRun ? null : createClient(url!, key!, { auth: { persistSession: false } })
  const runId = randomUUID()

  if (sb) {
    const { data: locked, error } = await sb.rpc('try_acquire_ingest_lock', { p_name: LOCK_NAME, p_holder: runId, p_ttl_seconds: LOCK_TTL_SECONDS })
    if (error) { console.error('Kilit alınamadı (migration 20261004 çalıştırıldı mı?):', error.message); process.exit(1) }
    if (!locked) { console.log('Başka bir alım çalışıyor; bu çalışma atlandı.'); return }
  }

  const settings = await loadSettings(sb)
  const geocoder = sb ? new Geocoder(sb, m => console.log(`[geocode] ${m}`)) : null
  const statuses: string[] = []
  try {
    for (const adapter of adapters) {
      if (getCatalogEntry(adapter.id)?.decision !== 'integrated') { console.log(`[${adapter.id}] katalogda entegre değil, atlanıyor`); continue }
      statuses.push(await runSource(adapter, sb, settings.get(adapter.id), geocoder, runId))
    }
    if (sb) await markPast(sb)
  } finally {
    if (sb) await sb.rpc('release_ingest_lock', { p_name: LOCK_NAME, p_holder: runId })
  }

  const ran = statuses.filter(s => s !== 'skipped')
  console.log(`\nBitti: ${statuses.join(', ')}`)
  // Hepsi başarısızsa CI hata versin (GitHub e-posta ile haber verir)
  if (ran.length > 0 && ran.every(s => s === 'failed')) process.exit(1)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
