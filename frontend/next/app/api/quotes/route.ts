import { NextResponse, type NextRequest } from 'next/server'
import { quoteSchema } from '@/lib/schemas'
import { getApiContext, isApiError } from '@/lib/api/context'
import { invalid, isResponse, readJson } from '@/lib/api/validation'
import { getQuoteDetail } from '@/lib/quotes'
import { serializeQuoteSummary } from '@/lib/serializers'

const statuses = ['draft', 'sent', 'viewed', 'approved', 'declined', 'expired'] as const

export async function GET(request: NextRequest) {
  const context = await getApiContext()
  if (isApiError(context)) return context
  const status = request.nextUrl.searchParams.get('status') ?? ''
  if (status && !statuses.includes(status as typeof statuses[number])) return invalid()
  let query = context.supabase.from('quotes').select('*, customer:customers(name)').eq('business_id', context.business.id).order('created_at', { ascending: false }).limit(500)
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Não foi possível carregar os orçamentos.' }, { status: 500 })
  return NextResponse.json(data.map(serializeQuoteSummary))
}

export async function POST(request: NextRequest) {
  const context = await getApiContext()
  if (isApiError(context)) return context
  const body = await readJson(request)
  if (isResponse(body)) return body
  const parsed = quoteSchema.safeParse(body)
  if (!parsed.success) return invalid()
  const { data: quoteId, error } = await context.supabase.rpc('save_quote', {
    p_quote_id: null,
    p_customer_id: parsed.data.customerId,
    p_title: parsed.data.title,
    p_discount_amount: parsed.data.discountAmount,
    p_execution_days: parsed.data.executionDays,
    p_validity_days: parsed.data.validityDays,
    p_notes: parsed.data.notes,
    p_payment_conditions: parsed.data.paymentConditions,
    p_items: parsed.data.items,
  })
  if (error || !quoteId) {
    const isLimit = error?.message?.includes('free plan monthly quote limit reached')
    return NextResponse.json({ error: isLimit ? 'Seu plano gratuito permite até 5 orçamentos por mês. Assine o Profissional para continuar.' : 'Não foi possível criar o orçamento.' }, { status: isLimit ? 402 : 400 })
  }
  const result = await getQuoteDetail(context.supabase, context.business.id, quoteId)
  if (!result.data) return NextResponse.json({ error: 'Orçamento criado, mas não foi possível carregá-lo.' }, { status: 500 })
  return NextResponse.json(result.data, { status: 201 })
}
