import { NextResponse, type NextRequest } from 'next/server'
import { catalogSchema } from '@/lib/schemas'
import { getApiContext, isApiError } from '@/lib/api/context'
import { invalid, isResponse, readJson, validUuid } from '@/lib/api/validation'
import { serializeCatalogItem } from '@/lib/serializers'

type RouteProps = { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, { params }: RouteProps) {
  const context = await getApiContext()
  if (isApiError(context)) return context
  const { id } = await params
  if (!validUuid(id)) return NextResponse.json({ error: 'Item não encontrado.' }, { status: 404 })
  const body = await readJson(request)
  if (isResponse(body)) return body
  const parsed = catalogSchema.safeParse(body)
  if (!parsed.success) return invalid()
  const { data, error } = await context.supabase.from('catalog_items').update({
    name: parsed.data.name,
    description: parsed.data.description,
    unit: parsed.data.unit,
    price: parsed.data.price,
    estimated_cost: parsed.data.estimatedCost,
    category: parsed.data.category,
  }).eq('id', id).eq('business_id', context.business.id).select('*').maybeSingle()
  if (error) return NextResponse.json({ error: error.code === '42501' ? 'O catálogo exige o plano Profissional.' : 'Não foi possível atualizar o item.' }, { status: error.code === '42501' ? 403 : 500 })
  if (!data) return NextResponse.json({ error: 'Item não encontrado.' }, { status: 404 })
  return NextResponse.json(serializeCatalogItem(data))
}

export async function DELETE(_request: NextRequest, { params }: RouteProps) {
  const context = await getApiContext()
  if (isApiError(context)) return context
  const { id } = await params
  if (!validUuid(id)) return NextResponse.json({ error: 'Item não encontrado.' }, { status: 404 })
  const { data, error } = await context.supabase.from('catalog_items').delete().eq('id', id).eq('business_id', context.business.id).select('id').maybeSingle()
  if (error) return NextResponse.json({ error: error.code === '42501' ? 'O catálogo exige o plano Profissional.' : 'Não foi possível excluir o item.' }, { status: error.code === '42501' ? 403 : 500 })
  if (!data) return NextResponse.json({ error: 'Item não encontrado.' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
