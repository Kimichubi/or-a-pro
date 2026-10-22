import { NextResponse, type NextRequest } from 'next/server'
import { quoteSchema } from '@/lib/schemas'
import { getApiContext, isApiError } from '@/lib/api/context'
import { invalid, isResponse, readJson, validUuid } from '@/lib/api/validation'
import { getQuoteDetail } from '@/lib/quotes'

type RouteProps = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteProps) {
  const context = await getApiContext()
  if (isApiError(context)) return context
  const { id } = await params
  if (!validUuid(id)) return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 })
  const result = await getQuoteDetail(context.supabase, context.business.id, id)
  if (!result.data) return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 })
  return NextResponse.json(result.data)
}

export async function PUT(request: NextRequest, { params }: RouteProps) {
  const context = await getApiContext()
  if (isApiError(context)) return context
  const { id } = await params
  if (!validUuid(id)) return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 })
  const body = await readJson(request)
  if (isResponse(body)) return body
  const parsed = quoteSchema.safeParse(body)
  if (!parsed.success) return invalid()
  const { data: quoteId, error } = await context.supabase.rpc('save_quote', {
    p_quote_id: id,
    p_customer_id: parsed.data.customerId,
    p_title: parsed.data.title,
    p_discount_amount: parsed.data.discountAmount,
    p_execution_days: parsed.data.executionDays,
    p_validity_days: parsed.data.validityDays,
    p_notes: parsed.data.notes,
    p_payment_conditions: parsed.data.paymentConditions,
    p_items: parsed.data.items,
  })
  if (error || !quoteId) return NextResponse.json({ error: 'Não foi possível atualizar o orçamento.' }, { status: error?.code === 'P0002' ? 404 : 400 })
  const result = await getQuoteDetail(context.supabase, context.business.id, id)
  if (!result.data) return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 })
  return NextResponse.json(result.data)
}

export async function DELETE(_request: NextRequest, { params }: RouteProps) {
  const context = await getApiContext()
  if (isApiError(context)) return context
  const { id } = await params
  if (!validUuid(id)) return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 })
  const { data, error } = await context.supabase.from('quotes').delete().eq('id', id).eq('business_id', context.business.id).select('id').maybeSingle()
  if (error) return NextResponse.json({ error: 'Não foi possível excluir o orçamento.' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
