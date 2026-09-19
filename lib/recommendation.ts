// lib/recommendation.ts
// Personalization and match score engine for 18-23

import type { Event } from './types';
import { getDistanceFromLatLonInKm } from './utils';

export interface UserSignals {
  preferences: string[];        // ['Müzik', 'Tiyatro', 'Stand-Up']
  favoriteEventIds: number[];
  userLat?: number;
  userLng?: number;
  maxBudget?: number;
  activeMood?: string;
}

export interface ScoredEvent extends Event {
  matchScore: number;           // 0 - 100
  matchReason: string;
  distanceKm?: number;
  walkMinutes?: number;
}

/**
 * Calculates a match score (0 to 100) and contextual explanation for an event based on user signals.
 */
export function scoreEventForUser(event: Event, signals: UserSignals): { score: number; reason: string; distanceKm?: number; walkMinutes?: number } {
  let score = 50; // Baseline score
  const reasons: string[] = [];

  // 1. Category Affinity (up to +25)
  if (signals.preferences.length > 0) {
    if (signals.preferences.includes(event.category)) {
      score += 25;
      reasons.push(`${event.category} ilgi alanınızla uyuşuyor`);
    }
  }

  // 2. Active Mood Match (up to +20)
  if (signals.activeMood && signals.activeMood !== 'Tümü') {
    if (event.ai_mood && event.ai_mood.toLowerCase().includes(signals.activeMood.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ\s]/g, '').trim().toLowerCase())) {
      score += 20;
      reasons.push(`${signals.activeMood} modunuza tam uygun`);
    }
  }

  // 3. Featured / Curated Event bonus (up to +15)
  if (event.is_featured) {
    score += 15;
    reasons.push('Editörler tarafından bu akşamın öne çıkanı seçildi');
  }

  // 4. Budget fit (up to +15)
  if (signals.maxBudget !== undefined && signals.maxBudget > 0) {
    if (event.min_price !== null && event.min_price !== undefined) {
      if (event.min_price <= signals.maxBudget) {
        score += 15;
        if (event.min_price === 0) reasons.push('Tamamen ücretsiz');
        else reasons.push(`Bütçenize uygun (${event.min_price} TL)`);
      } else {
        score -= 20; // Over budget penalty
      }
    }
  }

  // 5. Time Proximity (After-Work Window: 18:00 - 23:00)
  const eventDate = new Date(event.start_time);
  if (!isNaN(eventDate.getTime())) {
    const hour = eventDate.getHours();
    if (hour >= 18 && hour <= 22) {
      score += 10;
      reasons.push(`İş çıkışı saat ${hour}:${eventDate.getMinutes().toString().padStart(2, '0')}'de başlıyor`);
    }
  }

  // 6. Distance & Walk time (if user GPS coordinates available)
  let distanceKm: number | undefined;
  let walkMinutes: number | undefined;

  if (signals.userLat && signals.userLng && event.lat && event.lng) {
    distanceKm = Math.round(getDistanceFromLatLonInKm(signals.userLat, signals.userLng, event.lat, event.lng) * 10) / 10;
    
    // Average walking speed ~ 4.5 km/h -> ~13.3 min per km
    walkMinutes = Math.round(distanceKm * 13.3);

    if (distanceKm <= 2.0) {
      score += 15;
      reasons.push(`Bulunduğunuz yere çok yakın (🚶 ${walkMinutes} dk yürüme)`);
    } else if (distanceKm <= 8.0) {
      score += 8;
      reasons.push(`🚗 ~${Math.round(distanceKm * 2)} dk mesafede (${distanceKm} km)`);
    }
  }

  // Cap between 60% and 99% for credible consumer UI feel
  const finalScore = Math.min(99, Math.max(60, score));
  const finalReason = reasons.length > 0 ? reasons.slice(0, 2).join(' • ') : 'Bu akşam için popüler ve değerlendirilmeye değer';

  return {
    score: finalScore,
    reason: finalReason,
    distanceKm,
    walkMinutes
  };
}

/**
 * Enriches and sorts a list of events with personalized match scores.
 */
export function rankEvents(events: Event[], signals: UserSignals): ScoredEvent[] {
  const scored = events.map(ev => {
    const { score, reason, distanceKm, walkMinutes } = scoreEventForUser(ev, signals);
    return {
      ...ev,
      matchScore: score,
      matchReason: reason,
      distanceKm,
      walkMinutes
    };
  });

  // Sort descending by match score, keeping featured priority intact
  return scored.sort((a, b) => {
    if (a.is_featured && !b.is_featured) return -1;
    if (!a.is_featured && b.is_featured) return 1;
    return b.matchScore - a.matchScore;
  });
}
