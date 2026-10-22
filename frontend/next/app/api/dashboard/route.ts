import { NextResponse } from 'next/server'
import { getApiContext, isApiError } from '@/lib/api/context'

export async function GET() {
  const context = await getApiContext()
  if (isApiError(context)) return context
  const { data, error } = await context.supabase.rpc('owner_dashboard', { p_business_id: context.business.id })
  if (error) return NextResponse.json({ error: 'Não foi possível carregar o painel.' }, { status: 500 })
  return NextResponse.json(data)
}
