import { NextResponse, type NextRequest } from 'next/server'
import { customerSchema } from '@/lib/schemas'
import { getApiContext, invalidBody, isApiError } from '@/lib/api/context'
import { serializeCustomer } from '@/lib/serializers'

type RouteProps = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteProps) {
  const context = await getApiContext()
  if (isApiError(context)) return context
  const { id } = await params
  const { data, error } = await context.supabase.from('customers').select('*').eq('id', id).eq('business_id', context.business.id).maybeSingle()
  if (error) return NextResponse.json({ error: 'Não foi possível carregar o cliente.' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })
  return NextResponse.json(serializeCustomer(data))
}

export async function PUT(request: NextRequest, { params }: RouteProps) {
  const context = await getApiContext()
  if (isApiError(context)) return context
  const { id } = await params
  let body: unknown
  try { body = await request.json() } catch { return invalidBody() }
  const parsed = customerSchema.safeParse(body)
  if (!parsed.success) return invalidBody()
  const payload = parsed.data

  const { data, error } = await context.supabase.from('customers').update({
    name: payload.name,
    phone: payload.phone,
    email: payload.email,
    document: payload.document,
    service_address: payload.serviceAddress,
    notes: payload.notes,
  }).eq('id', id).eq('business_id', context.business.id).select('*').maybeSingle()
  if (error) return NextResponse.json({ error: 'Não foi possível atualizar o cliente.' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })
  return NextResponse.json(serializeCustomer(data))
}

export async function DELETE(_request: NextRequest, { params }: RouteProps) {
  const context = await getApiContext()
  if (isApiError(context)) return context
  const { id } = await params
  const { data, error } = await context.supabase.from('customers').delete().eq('id', id).eq('business_id', context.business.id).select('id').maybeSingle()
  if (error) return NextResponse.json({ error: 'Não foi possível excluir o cliente.' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
