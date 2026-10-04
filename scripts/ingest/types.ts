// scripts/ingest/types.ts
import type { SourceType } from '../../lib/sources/catalog'
import type { HttpClient } from './http'

export type ErrorClass = 'network' | 'access_denied' | 'schema_change' | 'invalid_data' | 'rate_limited'

export class SourceError extends Error {
  constructor(public kind: ErrorClass, message: string, public status?: number) {
    super(message)
    this.name = 'SourceError'
  }
}

export type EventKind = 'ticketed' | 'free' | 'registration' | 'editorial' | 'official'
export type EventStatus = 'active' | 'postponed' | 'cancelled' | 'sold_out' | 'upcoming_sale' | 'past' | 'inactive'

/** Bir kaynaktan gelen, uygulama modeline normalize edilmiş etkinlik. Bilinmeyen alan boş kalır; tahmin edilmez. */
export interface NormalizedEvent {
  sourceEventId: string
  url: string                 // Kaynaktaki kanonik etkinlik sayfası
  ticketUrl?: string          // Resmi bilet bağlantısı
  registrationUrl?: string    // Kayıt/başvuru bağlantısı
  title: string
  description?: string
  category: string            // Uygulama kategorisi (Müzik, Tiyatro, ...)
  subType?: string            // Kaynaktaki tür (ör. "SERGİ", "Konser")
  startTime: string           // ISO 8601, ofsetli
  endTime?: string
  timezone: string
  city: string
  district?: string
  venueName?: string
  address?: string
  lat?: number
  lng?: number
  organizerName?: string
  priceMin?: number
  priceMax?: number
  currency?: string
  eventKind: EventKind
  status?: EventStatus        // Yalnızca kaynak doğruluyorsa
  imageUrl?: string
}

export interface FetchResult {
  events: NormalizedEvent[]
  fetched: number             // Kaynaktan okunan ham kayıt sayısı
  invalid: number             // Doğrulamadan geçemeyenler
  errors: Partial<Record<ErrorClass, number>>
  /** Kaynak listesinin tamamı okunabildi mi? (false ise kaybolanlar pasifleştirilmez) */
  complete: boolean
}

export interface SourceAdapter {
  id: string
  type: SourceType
  defaultMinIntervalMs: number
  defaultTimeoutMs: number
  fetchEvents(http: HttpClient, log: (msg: string) => void): Promise<FetchResult>
}

export function emptyResult(): FetchResult {
  return { events: [], fetched: 0, invalid: 0, errors: {}, complete: true }
}

export function countError(result: FetchResult, e: unknown) {
  const kind: ErrorClass = e instanceof SourceError ? e.kind : 'invalid_data'
  result.errors[kind] = (result.errors[kind] || 0) + 1
}
