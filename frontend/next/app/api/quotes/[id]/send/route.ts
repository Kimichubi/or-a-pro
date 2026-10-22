import { NextResponse, type NextRequest } from 'next/server'
import { getApiContext, isApiError } from '@/lib/api/context'
import { validUuid } from '@/lib/api/validation'
import { serializeQuote } from '@/lib/serializers'
import { getAppUrl } from '@/lib/stripe'

type RouteProps = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, { params }: RouteProps) {
  const context = await getApiContext()
  if (isApiError(context)) return context
  const { id } = await params
  if (!validUuid(id)) return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 })
  const { data: quote, error: quoteError } = await context.supabase.from('quotes').select('*').eq('id', id).eq('business_id', context.business.id).maybeSingle()
  if (quoteError || !quote) return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 })
  if (['approved', 'declined', 'expired'].includes(quote.status)) return NextResponse.json({ error: 'Este orçamento já foi encerrado.' }, { status: 409 })
  const appUrl = getAppUrl()
  if (!appUrl) return NextResponse.json({ error: 'O endereço público do app ainda não está configurado.' }, { status: 503 })
  const url = new URL(`/orcamento/${encodeURIComponent(quote.slug)}`, appUrl).toString()
  const { data: canShare, error: sendError } = await context.supabase.rpc('mark_quote_sent', { p_quote_id: id })
  if (sendError) return NextResponse.json({ error: 'Não foi possível preparar o orçamento.' }, { status: 500 })
  if (!canShare) return NextResponse.json({ error: 'Este orçamento já foi encerrado.' }, { status: 409 })
  const { data: customer } = await context.supabase.from('customers').select('name, phone').eq('id', quote.customer_id).maybeSingle()
  const message = `Olá${customer?.name ? ` ${customer.name}` : ''}! Preparei seu orçamento${quote.title ? ` de ${quote.title}` : ''}: ${url}`
  const { data: updatedQuote, error: updatedQuoteError } = await context.supabase.from('quotes').select('*').eq('id', id).eq('business_id', context.business.id).maybeSingle()
  if (updatedQuoteError || !updatedQuote) return NextResponse.json({ error: 'O link foi preparado, mas não foi possível recarregar o orçamento.' }, { status: 500 })
  return NextResponse.json({ link: url, message, quote: serializeQuote(updatedQuote), customerPhone: customer?.phone ?? '' })
}
