import { NextResponse } from 'next/server'
import { getSupabasePublicConfig } from '@/lib/supabase/config'

export const dynamic = 'force-dynamic'

export async function GET() {
  const config = getSupabasePublicConfig()
  if (!config) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  return NextResponse.json(config, { headers: { 'Cache-Control': 'no-store' } })
}
