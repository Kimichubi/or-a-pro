import 'server-only'
import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { CurrentProfile } from '@/lib/auth'

export type ApiContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
  user: User
  profile: CurrentProfile
  business: BusinessRow
}

export type BusinessRow = {
  id: string
  user_id: string
  name: string
  logo_url: string
  document: string
  phone: string
  whatsapp: string
  email: string
  address: string
  primary_color: string
  secondary_color: string
  terms_conditions: string
  created_at: string
  updated_at: string
}

export async function getApiContext(): Promise<ApiContext | NextResponse> {
  let supabase: ApiContext['supabase']
  try {
    supabase = await createSupabaseServerClient()
  } catch {
    return NextResponse.json({ error: 'Serviço indisponível neste ambiente.' }, { status: 503 })
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 })

  const [{ data: profile, error: profileError }, { data: business, error: businessError }] = await Promise.all([
    supabase.from('profiles').select('id, email, name, role, created_at').eq('id', user.id).maybeSingle(),
    supabase.from('businesses').select('*').eq('user_id', user.id).maybeSingle(),
  ])
  if (profileError || businessError) return NextResponse.json({ error: 'Não foi possível carregar a conta.' }, { status: 500 })
  if (!profile || !business) return NextResponse.json({ error: 'Conta incompleta.' }, { status: 409 })

  return { supabase, user, profile: profile as CurrentProfile, business: business as BusinessRow }
}

export function isApiError(value: ApiContext | NextResponse): value is NextResponse {
  return value instanceof NextResponse
}

export function invalidBody() {
  return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
}

export function databaseError() {
  return NextResponse.json({ error: 'Não foi possível concluir a operação.' }, { status: 500 })
}
