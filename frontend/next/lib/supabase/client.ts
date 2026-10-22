'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabasePublicConfig } from './config'

type BrowserClient = ReturnType<typeof createBrowserClient>
let browserClient: BrowserClient | null = null
let configPromise: Promise<SupabasePublicConfig> | null = null

async function loadPublicConfig() {
  const response = await fetch('/api/config/supabase', { cache: 'no-store' })
  if (!response.ok) throw new Error('O Supabase ainda não foi configurado neste ambiente.')
  const config = await response.json() as SupabasePublicConfig
  if (!config.url || !config.publishableKey) throw new Error('O Supabase ainda não foi configurado neste ambiente.')
  return config
}

export async function createSupabaseBrowserClient(): Promise<BrowserClient> {
  if (browserClient) return browserClient
  configPromise ??= loadPublicConfig()
  const config = await configPromise
  browserClient ??= createBrowserClient(config.url, config.publishableKey)
  return browserClient
}
