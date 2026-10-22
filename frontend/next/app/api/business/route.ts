import { NextResponse, type NextRequest } from 'next/server'
import { businessSchema } from '@/lib/schemas'
import { databaseError, getApiContext, invalidBody, isApiError } from '@/lib/api/context'
import { serializeBusiness } from '@/lib/serializers'

export async function GET() {
  const context = await getApiContext()
  if (isApiError(context)) return context
  return NextResponse.json(serializeBusiness(context.business))
}

export async function PUT(request: NextRequest) {
  const context = await getApiContext()
  if (isApiError(context)) return context
  let body: unknown
  try { body = await request.json() } catch { return invalidBody() }
  const parsed = businessSchema.safeParse(body)
  if (!parsed.success) return invalidBody()

  const { data, error } = await context.supabase
    .from('businesses')
    .update({
      name: parsed.data.name,
      document: parsed.data.document,
      phone: parsed.data.phone,
      whatsapp: parsed.data.whatsapp,
      email: parsed.data.email,
      address: parsed.data.address,
      primary_color: parsed.data.primaryColor,
      secondary_color: parsed.data.secondaryColor,
      terms_conditions: parsed.data.termsConditions,
    })
    .eq('user_id', context.user.id)
    .select('*')
    .single()
  if (error || !data) return databaseError()
  return NextResponse.json(serializeBusiness(data))
}
