import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  await requireAdmin('/app/admin')
  try {
    const { data, error } = await createSupabaseAdminClient().rpc('admin_overview')
    if (error || !data) throw new Error('admin overview unavailable')
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Não foi possível carregar o painel administrativo.' }, { status: 503 })
  }
}
