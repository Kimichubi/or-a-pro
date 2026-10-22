import { NextResponse, type NextRequest } from 'next/server'
import { customerSchema } from '@/lib/schemas'
import { getApiContext, invalidBody, isApiError } from '@/lib/api/context'
import { serializeCustomer } from '@/lib/serializers'

export async function GET(request: NextRequest) {
  const context = await getApiContext()
  if (isApiError(context)) return context
  const search = (request.nextUrl.searchParams.get('search') ?? '').trim().slice(0, 100)
  let query = context.supabase.from('customers').select('*').eq('business_id', context.business.id).order('created_at', { ascending: false })
  if (search) query = query.ilike('name', `%${search}%`)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Não foi possível carregar os clientes.' }, { status: 500 })
  return NextResponse.json(data.map(serializeCustomer))
}

export async function POST(request: NextRequest) {
  const context = await getApiContext()
  if (isApiError(context)) return context
  let body: unknown
  try { body = await request.json() } catch { return invalidBody() }
  const parsed = customerSchema.safeParse(body)
  if (!parsed.success) return invalidBody()
  const payload = parsed.data

  const { data, error } = await context.supabase.from('customers').insert({
    business_id: context.business.id,
    name: payload.name,
    phone: payload.phone,
    email: payload.email,
    document: payload.document,
    service_address: payload.serviceAddress,
    notes: payload.notes,
  }).select('*').single()
  if (error || !data) return NextResponse.json({ error: 'Não foi possível criar o cliente.' }, { status: 500 })
  return NextResponse.json(serializeCustomer(data), { status: 201 })
}
