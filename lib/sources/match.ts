// lib/sources/match.ts
// Farklı kaynaklardan gelen aynı etkinliği bulmak için güven puanı.
// Kural: aynı şehir şart; başlık benzerliği ağırlıklı, aynı gün ve mekân benzerliği destekleyici.
import { calculateSimilarity, normalizeText } from '../dedup'
import { localDay } from './normalize'

export interface MatchCandidate {
  title: string
  startTime: string
  city?: string | null
  venueName?: string | null
}

export const MERGE_THRESHOLD = 0.85   // ≥ → otomatik birleştir
export const REVIEW_THRESHOLD = 0.6   // [0.6, 0.85) → ayrı tut, inceleme için işaretle

export function matchScore(a: MatchCandidate, b: MatchCandidate): number {
  if (!a.city || !b.city || a.city !== b.city) return 0
  const sameDay = localDay(a.startTime) === localDay(b.startTime)
  const hoursApart = Math.abs(new Date(a.startTime).getTime() - new Date(b.startTime).getTime()) / 3_600_000
  if (!sameDay && hoursApart > 12) return 0

  const titleSim = calculateSimilarity(a.title, b.title)
  const venueSim = a.venueName && b.venueName ? calculateSimilarity(a.venueName, b.venueName) : 0.5
  const timeScore = hoursApart <= 0.5 ? 1 : hoursApart <= 3 ? 0.7 : 0.4

  return Math.round((titleSim * 0.6 + timeScore * 0.25 + venueSim * 0.15) * 1000) / 1000
}

export type MatchDecision = { action: 'merge' | 'review' | 'new'; score: number }

export function decideMatch(score: number): MatchDecision {
  if (score >= MERGE_THRESHOLD) return { action: 'merge', score }
  if (score >= REVIEW_THRESHOLD) return { action: 'review', score }
  return { action: 'new', score }
}

/** Kaynağın değişip değişmediğini anlamak için alanların kararlı özeti */
export function contentHash(fields: Record<string, unknown>): string {
  const s = JSON.stringify(fields, Object.keys(fields).sort())
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

export { normalizeText }
