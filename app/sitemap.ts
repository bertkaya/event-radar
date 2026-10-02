import { MetadataRoute } from 'next'
import { getSupabasePublic } from '@/lib/supabase-server'
import { SITE_URL, eventUrl } from '@/lib/site'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString()
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'hourly', priority: 1 },
    { url: `${SITE_URL}/kvkk`, lastModified: now, changeFrequency: 'yearly', priority: 0.1 },
  ]

  const supabase = getSupabasePublic()
  if (!supabase) return staticRoutes

  // Yalnızca gelecekteki onaylı etkinlikler (RLS zaten onaysızları gizler)
  const { data: events } = await supabase
    .from('events')
    .select('id, created_at')
    .eq('is_approved', true)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(5000)

  const eventRoutes: MetadataRoute.Sitemap = (events || []).map(e => ({
    url: eventUrl(e.id),
    lastModified: e.created_at,
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  return [...staticRoutes, ...eventRoutes]
}
