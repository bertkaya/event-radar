// scripts/ingest/http.ts
// Kaynak başına nazik HTTP istemcisi: istekler arası asgari bekleme, zaman aşımı,
// sınırlı tekrar deneme + exponential backoff, hata sınıflandırma.
// Bot doğrulaması / erişim engeli tespit edilirse tekrar denemez, atlatmaya çalışmaz.
import { SourceError } from './types'

export const USER_AGENT = '18-23-EventBot/1.0 (+https://event-radar-rho.vercel.app; iletisim@18-23.com)'

export interface HttpOptions {
  minIntervalMs: number
  timeoutMs: number
  retries?: number       // Toplam ek deneme (varsayılan 2 → en fazla 3 istek)
  backoffBaseMs?: number // 1. tekrar ~base, 2. ~2×base, ... (+ rastgele sapma)
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

const CHALLENGE_RE = /<title>\s*(Just a moment|Attention Required|Access denied)|cf-challenge|captcha/i

export class HttpClient {
  private lastRequestAt = 0
  private retries: number
  private backoffBaseMs: number
  requests = 0

  constructor(private opts: HttpOptions) {
    this.retries = opts.retries ?? 2
    this.backoffBaseMs = opts.backoffBaseMs ?? 2000
  }

  private async throttle() {
    const wait = this.lastRequestAt + this.opts.minIntervalMs - Date.now()
    if (wait > 0) await sleep(wait)
    this.lastRequestAt = Date.now()
  }

  async text(url: string, headers: Record<string, string> = {}): Promise<string> {
    let lastError: SourceError | null = null
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      if (attempt > 0) {
        const retryAfter = lastError?.kind === 'rate_limited' && lastError.status ? lastError.status : 0
        const backoff = this.backoffBaseMs * 2 ** (attempt - 1) + Math.random() * 500
        await sleep(Math.max(backoff, retryAfter))
      }
      await this.throttle()
      this.requests++
      let res: Response
      try {
        res = await fetch(url, {
          headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'tr-TR,tr;q=0.9', ...headers },
          signal: AbortSignal.timeout(this.opts.timeoutMs),
          redirect: 'follow',
        })
      } catch (e) {
        lastError = new SourceError('network', `${url}: ${(e as Error).message}`)
        continue // geçici ağ hatası → tekrar dene
      }

      if (res.status === 429) {
        const ra = Number(res.headers.get('retry-after'))
        // status alanını "beklenecek ms" olarak taşı
        lastError = new SourceError('rate_limited', `${url}: 429`, Number.isFinite(ra) ? Math.min(ra * 1000, 60000) : 0)
        continue
      }
      if (res.status >= 500) {
        lastError = new SourceError('network', `${url}: HTTP ${res.status}`, res.status)
        continue
      }

      const body = await res.text()
      if (res.status === 401 || res.status === 403 || CHALLENGE_RE.test(body.slice(0, 4000))) {
        throw new SourceError('access_denied', `${url}: erişim reddedildi / bot doğrulaması (HTTP ${res.status})`, res.status)
      }
      if (res.status === 404 || res.status === 410) {
        throw new SourceError('schema_change', `${url}: HTTP ${res.status} (uç nokta kaldırılmış olabilir)`, res.status)
      }
      if (!res.ok) {
        throw new SourceError('network', `${url}: HTTP ${res.status}`, res.status)
      }
      return body
    }
    throw lastError ?? new SourceError('network', `${url}: bilinmeyen hata`)
  }

  async json<T = unknown>(url: string): Promise<T> {
    const body = await this.text(url, { Accept: 'application/json' })
    try {
      return JSON.parse(body) as T
    } catch {
      throw new SourceError('schema_change', `${url}: JSON beklenirken farklı içerik geldi`)
    }
  }
}
