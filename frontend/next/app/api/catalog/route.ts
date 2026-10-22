import { NextResponse, type NextRequest } from 'next/server'
import { catalogSchema } from '@/lib/schemas'
import { getApiContext, isApiError } from '@/lib/api/context'
import { invalid, isResponse, readJson } from '@/lib/api/validation'
import { serializeCatalogItem } from '@/lib/serializers'

export async function GET(request: NextRequest) {
  const context = await getApiContext()
  if (isApiError(context)) return context
  const search = (request.nextUrl.searchParams.get('search') ?? '').trim().slice(0, 100)
  let query = context.supabase.from('catalog_items').select('*').eq('business_id', context.business.id).order('created_at', { ascending: false }).limit(500)
  if (search) query = query.ilike('name', `%${search}%`)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Não foi possível carregar o catálogo.' }, { status: 500 })
  return NextResponse.json(data.map(serializeCatalogItem))
}

export async function POST(request: NextRequest) {
  const context = await getApiContext()
  if (isApiError(context)) return context
  const body = await readJson(request)
  if (isResponse(body)) return body
  const parsed = catalogSchema.safeParse(body)
  if (!parsed.success) return invalid()
  const { data, error } = await context.supabase.from('catalog_items').insert({
    business_id: context.business.id,
    name: parsed.data.name,
    description: parsed.data.description,
    unit: parsed.data.unit,
    price: parsed.data.price,
    estimated_cost: parsed.data.estimatedCost,
    category: parsed.data.category,
  }).select('*').single()
  if (error) return NextResponse.json({ error: error.code === '42501' ? 'O catálogo exige o plano Profissional.' : 'Não foi possível criar o item.' }, { status: error.code === '42501' ? 403 : 500 })
  if (!data) return NextResponse.json({ error: 'Não foi possível criar o item.' }, { status: 500 })
  return NextResponse.json(serializeCatalogItem(data), { status: 201 })
}
