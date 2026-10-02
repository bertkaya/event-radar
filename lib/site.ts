// lib/site.ts
// Canonical site URL. Domain değişince sadece NEXT_PUBLIC_SITE_URL güncellenir.

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://event-radar-rho.vercel.app').replace(/\/$/, '')

export const eventUrl = (id: number | string) => `${SITE_URL}/etkinlik/${id}`
