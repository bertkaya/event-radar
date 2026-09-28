// lib/supabase-admin.ts
// SERVER-ONLY: service_role anahtarı RLS'i atlar. Asla client component'ten import etmeyin.
import 'server-only'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL tanımlı değil')
  return url.replace(/\/$/, '')
}

export function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY tanımlı değil')
  return key
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!client) {
    client = createClient(getSupabaseUrl(), getServiceRoleKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return client
}
