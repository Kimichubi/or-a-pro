export type SupabasePublicConfig = {
  url: string
  publishableKey: string
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']?.trim()
  const publishableKey = process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']?.trim()
  if (!url || !publishableKey) return null
  return { url, publishableKey }
}

export function getSupabaseSecretKey(): string | null {
  return process.env['SUPABASE_SECRET_KEY']?.trim() || null
}
