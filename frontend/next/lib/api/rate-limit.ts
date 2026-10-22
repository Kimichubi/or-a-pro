import 'server-only'
import { createHash } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function consumeRateLimit(request: NextRequest, scope: string, limit: number, seconds: number, extraKey = '') {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const clientIp = forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown'
  const keyHash = createHash('sha256').update(`${clientIp}:${extraKey}`).digest('hex')
  try {
    const { data, error } = await createSupabaseAdminClient().rpc('consume_rate_limit', {
      p_scope: scope,
      p_key_hash: keyHash,
      p_limit: limit,
      p_window_seconds: seconds,
    })
    if (error) return 'unavailable' as const
    return data ? 'allowed' as const : 'limited' as const
  } catch {
    return 'unavailable' as const
  }
}
