import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { quoteStatusSchema } from '@/lib/schemas'
import { getApiContext, isApiError } from '@/lib/api/context'
import { invalid, isResponse, readJson, validUuid } from '@/lib/api/validation'

type RouteProps = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteProps) {
  const context = await getApiContext()
  if (isApiError(context)) return context
  const { id } = await params
  if (!validUuid(id)) return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 })
  const body = await readJson(request)
  if (isResponse(body)) return body
  const parsed = z.object({ status: quoteStatusSchema }).strict().safeParse(body)
  if (!parsed.success) return invalid()
  const { error } = await context.supabase.rpc('set_quote_status', { p_quote_id: id, p_status: parsed.data.status })
  if (error) return NextResponse.json({ error: 'Não foi possível alterar o status do orçamento.' }, { status: error.code === 'P0002' ? 404 : 400 })
  return NextResponse.json({ ok: true })
}
