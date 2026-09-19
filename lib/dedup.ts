// lib/dedup.ts
// Intelligent event deduplication and canonical event clustering engine

import type { Event, TicketDetail } from './types';

export interface TicketSource {
  source: string;
  url: string;
  price: string;
}

/**
 * Normalizes Turkish text for fuzzy matching:
 * lowercase, replaces Turkish characters with ASCII equivalents, removes common suffixes.
 */
export function normalizeText(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/\s*(biletleri|konseri|oyunu|stand-up|gosterisi|etkinligi|live|sahnesi)\s*/gi, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes Token Jaccard similarity between two strings (0.0 to 1.0).
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeText(str1);
  const norm2 = normalizeText(str2);

  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0.0;

  const tokens1 = new Set(norm1.split(' ').filter(w => w.length > 2));
  const tokens2 = new Set(norm2.split(' ').filter(w => w.length > 2));

  if (tokens1.size === 0 || tokens2.size === 0) return 0.0;

  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);

  return intersection.size / union.size;
}

/**
 * Checks if two events represent the same real-world event:
 * - Same day (within 2 hours)
 * - High title similarity (> 0.55) or identical venue + moderate similarity
 */
export function areEventsDuplicate(eventA: Event, eventB: Event): boolean {
  if (eventA.id === eventB.id) return true;

  // 1. Check Date proximity
  const dateA = new Date(eventA.start_time);
  const dateB = new Date(eventB.start_time);
  if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return false;

  const timeDiffHours = Math.abs(dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60);
  if (timeDiffHours > 3) return false; // Must be within 3 hours on the same day

  // 2. Check Title Similarity
  const titleSim = calculateSimilarity(eventA.title, eventB.title);
  if (titleSim >= 0.7) return true;

  // 3. Check Venue Match with moderate title similarity
  const venueSim = calculateSimilarity(eventA.venue_name, eventB.venue_name);
  if (venueSim >= 0.6 && titleSim >= 0.4) return true;

  return false;
}

/**
 * Groups raw events into deduplicated canonical events,
 * aggregating multiple ticket sources and picking the best image/description.
 */
export function deduplicateEvents(events: Event[]): Event[] {
  const canonicalList: Event[] = [];

  for (const rawEvent of events) {
    let existingIndex = -1;

    for (let i = 0; i < canonicalList.length; i++) {
      if (areEventsDuplicate(canonicalList[i], rawEvent)) {
        existingIndex = i;
        break;
      }
    }

    if (existingIndex === -1) {
      // First time seeing this event — establish as canonical
      canonicalList.push({
        ...rawEvent,
        ticket_sources: rawEvent.ticket_url ? [{
          source: getSourceName(rawEvent.ticket_url),
          url: rawEvent.ticket_url,
          price: rawEvent.price || 'Fiyat Belirtilmemiş'
        }] : []
      });
    } else {
      // Merge with existing canonical event
      const target = canonicalList[existingIndex];

      // Add new ticket source if unique
      if (rawEvent.ticket_url) {
        const sourceName = getSourceName(rawEvent.ticket_url);
        target.ticket_sources = target.ticket_sources || [];
        const alreadyHasSource = target.ticket_sources.some(s => s.url === rawEvent.ticket_url || s.source === sourceName);
        if (!alreadyHasSource) {
          target.ticket_sources.push({
            source: sourceName,
            url: rawEvent.ticket_url,
            price: rawEvent.price || 'Fiyat Belirtilmemiş'
          });
        }
      }

      // Upgrade image if canonical has none
      if (!target.image_url && rawEvent.image_url) {
        target.image_url = rawEvent.image_url;
      }

      // Prefer richer description
      if ((!target.description || target.description.length < 50) && rawEvent.description && rawEvent.description.length > 50) {
        target.description = rawEvent.description;
      }

      // Preserve lowest price
      if (rawEvent.min_price !== null && rawEvent.min_price !== undefined) {
        if (target.min_price === null || target.min_price === undefined || rawEvent.min_price < target.min_price) {
          target.min_price = rawEvent.min_price;
          target.price = rawEvent.price;
        }
      }
    }
  }

  return canonicalList;
}

function getSourceName(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('biletix')) return 'Biletix';
    if (hostname.includes('passo')) return 'Passo';
    if (hostname.includes('bubilet')) return 'Bubilet';
    if (hostname.includes('biletinial')) return 'Biletinial';
    if (hostname.includes('lavarla')) return 'Lavarla';
    return hostname.replace('www.', '');
  } catch {
    return 'Bilet Linki';
  }
}
