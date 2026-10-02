// lib/admin-db.ts
// Admin panelinin Supabase istemcisi. Gerçek anahtar yerine /api/admin/sb proxy'sine gider;
// proxy admin cookie'sini doğrulayıp service_role ile iletir.
'use client'
import { createClient } from '@supabase/supabase-js'

const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'

export const adminDb = createClient(`${origin}/api/admin/sb`, 'admin-proxy', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'admin-proxy' },
})
