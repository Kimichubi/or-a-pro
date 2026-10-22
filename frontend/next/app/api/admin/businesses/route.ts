import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  await requireAdmin('/app/admin')
  const search = (request.nextUrl.searchParams.get('search') ?? '').trim().toLocaleLowerCase('pt-BR').slice(0, 100)
  try {
    const admin = createSupabaseAdminClient()
    const { data: businesses, error } = await admin.from('businesses').select('id,user_id,name,email,phone,created_at').order('created_at', { ascending: false }).limit(500)
    if (error) throw error
    const userIds = [...new Set((businesses ?? []).map((row) => row.user_id))]
    const [{ data: profiles }, { data: customers }, { data: quotes }] = await Promise.all([
      admin.from('profiles').select('id,name,email').in('id', userIds),
      admin.from('customers').select('business_id').in('business_id', (businesses ?? []).map((row) => row.id)).limit(10000),
      admin.from('quotes').select('business_id').in('business_id', (businesses ?? []).map((row) => row.id)).limit(10000),
    ])
    const profileById = new Map((profiles ?? []).map((row) => [row.id, row]))
    const customerCounts = new Map<string, number>()
    for (const row of customers ?? []) customerCounts.set(row.business_id, (customerCounts.get(row.business_id) ?? 0) + 1)
    const quoteCounts = new Map<string, number>()
    for (const row of quotes ?? []) quoteCounts.set(row.business_id, (quoteCounts.get(row.business_id) ?? 0) + 1)
    const result = (businesses ?? []).map((row) => {
      const owner = profileById.get(row.user_id)
      return {
        businessId: row.id,
        userId: row.user_id,
        businessName: row.name,
        ownerName: owner?.name ?? '',
        ownerEmail: owner?.email ?? '',
        email: row.email,
        phone: row.phone,
        customerCount: customerCounts.get(row.id) ?? 0,
        quoteCount: quoteCounts.get(row.id) ?? 0,
        createdAt: row.created_at,
      }
    }).filter((row) => !search || `${row.businessName} ${row.ownerName} ${row.ownerEmail}`.toLocaleLowerCase('pt-BR').includes(search))
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Não foi possível carregar as empresas.' }, { status: 503 })
  }
}
