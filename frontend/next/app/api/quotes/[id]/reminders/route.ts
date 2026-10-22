import { NextResponse, type NextRequest } from 'next/server'
import { reminderSchema } from '@/lib/schemas'
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
  const parsed = reminderSchema.safeParse(body)
  if (!parsed.success) return invalid()
  const { data, error } = await context.supabase.from('reminders').insert({ quote_id: id, message: parsed.data.message }).select('id, quote_id, message, created_at').maybeSingle()
  if (error) return NextResponse.json({ error: error.code === '42501' ? 'O histórico de lembretes exige o plano Profissional.' : 'Não foi possível registrar o lembrete.' }, { status: error.code === '42501' ? 403 : 500 })
  if (!data) return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 })
  return NextResponse.json({ id: data.id, quoteId: data.quote_id, message: data.message, createdAt: data.created_at }, { status: 201 })
}
