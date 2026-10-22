import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { serializeCustomer } from '@/lib/serializers'
import { validUuid } from '@/lib/api/validation'

export async function GET(request: NextRequest) {
  await requireAdmin('/app/admin')
  const search = (request.nextUrl.searchParams.get('search') ?? '').trim().toLocaleLowerCase('pt-BR').slice(0, 100)
  const businessId = request.nextUrl.searchParams.get('businessId') ?? ''
  if (businessId && !validUuid(businessId)) return NextResponse.json({ error: 'Empresa inválida.' }, { status: 400 })
  try {
    const admin = createSupabaseAdminClient()
    let query = admin.from('customers').select('*').order('created_at', { ascending: false }).limit(2000)
    if (businessId) query = query.eq('business_id', businessId)
    const { data: customers, error } = await query
    if (error) throw error
    const businessIds = [...new Set((customers ?? []).map((row) => row.business_id))]
    const { data: businesses } = businessIds.length ? await admin.from('businesses').select('id,name,user_id').in('id', businessIds) : { data: [] }
    const ownerIds = [...new Set((businesses ?? []).map((row) => row.user_id))]
    const { data: profiles } = ownerIds.length ? await admin.from('profiles').select('id,email').in('id', ownerIds) : { data: [] }
    const businessMap = new Map((businesses ?? []).map((row) => [row.id, row]))
    const profileMap = new Map((profiles ?? []).map((row) => [row.id, row]))
    const rows = (customers ?? []).map((customer) => {
      const business = businessMap.get(customer.business_id)
      const owner = business ? profileMap.get(business.user_id) : null
      return { ...serializeCustomer(customer), businessName: business?.name ?? '', ownerEmail: owner?.email ?? '' }
    }).filter((row) => !search || `${row.name} ${row.email} ${row.phone} ${row.businessName} ${row.ownerEmail}`.toLocaleLowerCase('pt-BR').includes(search))
    return NextResponse.json(rows)
  } catch {
    return NextResponse.json({ error: 'Não foi possível carregar os clientes.' }, { status: 503 })
  }
}
