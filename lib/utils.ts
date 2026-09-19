// lib/utils.ts
// Shared utility functions used across the app

/**
 * Calculates the great-circle distance (in km) between two lat/lng coordinates
 * using the Haversine formula.
 */
export function getDistanceFromLatLonInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/** Converts degrees to radians. */
export function deg2rad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * Formats a price string for display.
 * Replaces ₺ with TL and appends " TL" if the value is a bare number.
 */
export function formatPrice(price: string | undefined | null): string {
  if (!price) return ''
  let formatted = price.replace(/₺/g, 'TL')
  if (/^\d[\d.,\s]*$/.test(formatted.trim())) {
    formatted = formatted.trim() + ' TL'
  }
  return formatted
}
