// lib/rate-limit.ts
// Basit, bellek içi sabit pencere limiti. Serverless'ta instance başına çalışır;
// kaba spam/brute-force'u keser. Ciddi trafik için Upstash/Vercel KV'ye taşıyın.

const buckets = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k)
    }
    return true
  }
  bucket.count++
  return bucket.count <= limit
}

export function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}
