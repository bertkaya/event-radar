import { checkEnvVars } from '@/lib/debug';
import { createClient } from '@supabase/supabase-js';
import { MetadataRoute } from 'next';

const BASE_URL = 'https://18-23.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Static Routes
  const routes = [
    '',
    '/calendar',
    '/login',
    '/admin',
  ].map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'daily' as const,
    priority: 1,
  }));

  // Fetch Events for Dynamic Routes
  const { data: events } = await supabase
    .from('events')
    .select('id, start_time')
    .eq('is_approved', true);

  const eventRoutes = events?.map((event) => ({
    url: `${BASE_URL}/?event_id=${event.id}`, // Setup as query param or dynamic route if we had one like /event/[id]
    lastModified: event.start_time,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  })) || [];

  return [...routes, ...eventRoutes];
}