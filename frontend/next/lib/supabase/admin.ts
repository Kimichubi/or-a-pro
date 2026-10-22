import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { getSupabasePublicConfig, getSupabaseSecretKey } from './config'

export function createSupabaseAdminClient() {
  const publicConfig = getSupabasePublicConfig()
  const secretKey = getSupabaseSecretKey()
  if (!publicConfig || !secretKey) throw new Error('Supabase server credentials are not configured')

  return createClient(publicConfig.url, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })
}
