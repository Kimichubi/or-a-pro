import { NextResponse, type NextRequest } from 'next/server'
import { commentSchema } from '@/lib/schemas'
import { consumeRateLimit } from '@/lib/api/rate-limit'
import { isResponse, readJson } from '@/lib/api/validation'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

type RouteProps = { params: Promise<{ slug: string; decision: string }> }

export async function POST(request: NextRequest, { params }: RouteProps) {
  const { slug, decision } = await params
  if (!/^[a-f0-9]{32}$/i.test(slug) || !['approve', 'decline'].includes(decision)) return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 })
  const limit = await consumeRateLimit(request, 'public-decision', 10, 60, slug)
  if (limit === 'limited') return NextResponse.json({ error: 'Muitas tentativas. Aguarde e tente novamente.' }, { status: 429 })
  if (limit === 'unavailable') return NextResponse.json({ error: 'Serviço temporariamente indisponível.' }, { status: 503 })
  const body = await readJson(request)
  if (isResponse(body)) return body
  const parsed = commentSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Comentário inválido.' }, { status: 400 })
  try {
    const { data, error } = await createSupabaseAdminClient().rpc('decide_public_quote', {
      p_slug: slug,
      p_approved: decision === 'approve',
      p_comment: parsed.data.comment,
    })
    if (error) return NextResponse.json({ error: 'Não foi possível registrar a resposta.' }, { status: 503 })
    if (data === 'ok') return NextResponse.json({ ok: true })
    const messages: Record<string, string> = {
      not_found: 'Orçamento não encontrado.',
      already_decided: 'Este orçamento já recebeu uma resposta.',
      not_open: 'O prazo deste orçamento terminou ou ele não está disponível para resposta.',
    }
    return NextResponse.json({ error: messages[data] ?? 'Não foi possível registrar a resposta.' }, { status: data === 'not_found' ? 404 : 409 })
  } catch {
    return NextResponse.json({ error: 'Serviço temporariamente indisponível.' }, { status: 503 })
  }
}
