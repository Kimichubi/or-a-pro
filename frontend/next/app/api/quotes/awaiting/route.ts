import { NextResponse } from 'next/server'
import { getApiContext, isApiError } from '@/lib/api/context'

export async function GET() {
  const context = await getApiContext()
  if (isApiError(context)) return context
  const { data, error } = await context.supabase.from('quotes')
    .select('id, slug, title, status, total, sent_at, validity_days, customer:customers(name, phone)')
    .eq('business_id', context.business.id)
    .in('status', ['sent', 'viewed'])
    .order('sent_at', { ascending: true })
    .limit(100)
  if (error) return NextResponse.json({ error: 'Não foi possível carregar os orçamentos pendentes.' }, { status: 500 })
  const now = Date.now()
  const rows = data as unknown as { id: string; slug: string; title: string; status: string; total: number | string; sent_at: string; customer: { name: string; phone: string } | { name: string; phone: string }[] | null }[]
  return NextResponse.json(rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    customer: (Array.isArray(row.customer) ? row.customer[0]?.name : row.customer?.name) ?? '',
    customerPhone: (Array.isArray(row.customer) ? row.customer[0]?.phone : row.customer?.phone) ?? '',
    total: Number(row.total),
    daysPending: Math.max(0, Math.floor((now - new Date(row.sent_at).getTime()) / 86_400_000)),
    status: row.status,
  })))
}
