import { NextResponse, type NextRequest } from 'next/server'
import { customerSchema } from '@/lib/schemas'
import { requireAdmin } from '@/lib/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { invalid, isResponse, readJson, validUuid } from '@/lib/api/validation'
import { serializeCustomer } from '@/lib/serializers'

type RouteProps = { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, { params }: RouteProps) {
  await requireAdmin('/app/admin')
  const { id } = await params
  if (!validUuid(id)) return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })
  const body = await readJson(request)
  if (isResponse(body)) return body
  const parsed = customerSchema.safeParse(body)
  if (!parsed.success) return invalid()
  try {
    const { data, error } = await createSupabaseAdminClient().from('customers').update({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      document: parsed.data.document,
      service_address: parsed.data.serviceAddress,
      notes: parsed.data.notes,
    }).eq('id', id).select('*').maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })
    return NextResponse.json(serializeCustomer(data))
  } catch {
    return NextResponse.json({ error: 'Não foi possível atualizar o cliente.' }, { status: 503 })
  }
}
