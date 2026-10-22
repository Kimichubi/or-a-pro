import { NextResponse, type NextRequest } from 'next/server'
import { getApiContext, isApiError } from '@/lib/api/context'
import { serializeBusiness } from '@/lib/serializers'
import { z } from 'zod'

export async function GET() {
  const context = await getApiContext()
  if (isApiError(context)) return context
  return NextResponse.json({
    user: { id: context.user.id, email: context.user.email, name: context.profile.name, createdAt: context.profile.created_at ?? context.user.created_at },
    business: serializeBusiness(context.business),
    isAdmin: context.profile.role === 'admin',
  })
}

const profileUpdateSchema = z.object({ name: z.string().trim().max(120) }).strict()

export async function PATCH(request: NextRequest) {
  const context = await getApiContext()
  if (isApiError(context)) return context
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 }) }
  const parsed = profileUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Nome inválido.' }, { status: 400 })

  const { error } = await context.supabase.from('profiles').update({ name: parsed.data.name }).eq('id', context.user.id)
  if (error) return NextResponse.json({ error: 'Não foi possível atualizar o perfil.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
