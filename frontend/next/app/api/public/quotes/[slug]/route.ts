import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { consumeRateLimit } from '@/lib/api/rate-limit'

type RouteProps = { params: Promise<{ slug: string }> }

export async function GET(request: NextRequest, { params }: RouteProps) {
  const limit = await consumeRateLimit(request, 'public-quote', 60, 60)
  if (limit === 'limited') return NextResponse.json({ error: 'Muitas consultas. Aguarde um minuto e tente novamente.' }, { status: 429 })
  if (limit === 'unavailable') return NextResponse.json({ error: 'Serviço temporariamente indisponível.' }, { status: 503 })
  const { slug } = await params
  if (!/^[a-f0-9]{32}$/i.test(slug)) return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 })
  try {
    const admin = createSupabaseAdminClient()
    const { data: quote, error } = await admin.from('quotes').select(
      'id, slug, title, status, discount_amount, execution_days, validity_days, notes, payment_conditions, subtotal, total, created_at, sent_at, business_id, customer:customers(name), business:businesses(name,logo_url,phone,email,primary_color,secondary_color,terms_conditions), items:quote_items(name,description,unit,quantity,unit_price,total)',
    ).eq('slug', slug).maybeSingle()
    if (error || !quote || quote.status === 'draft') return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 })
    const row = quote as unknown as {
      title: string; discount_amount: number | string; execution_days: number; validity_days: number; notes: string; payment_conditions: string
      subtotal: number | string; total: number | string; created_at: string; sent_at: string | null; status: string
      customer: { name: string } | null
      business: { name: string; logo_url: string; phone: string; email: string; primary_color: string; secondary_color: string; terms_conditions: string } | null
      items: { name: string; description: string; unit: string; quantity: number | string; unit_price: number | string; total: number | string }[]
    }
    const deadline = row.sent_at ? new Date(row.sent_at).getTime() + Number(row.validity_days) * 86_400_000 : 0
    const canRespond = ['sent', 'viewed'].includes(row.status) && deadline > Date.now()
    if (canRespond) await admin.rpc('mark_quote_viewed', { p_slug: slug })
    return NextResponse.json({
      title: row.title,
      discountAmount: Number(row.discount_amount),
      executionDays: row.execution_days,
      validityDays: row.validity_days,
      notes: row.notes,
      paymentConditions: row.payment_conditions,
      subtotal: Number(row.subtotal),
      total: Number(row.total),
      createdAt: row.created_at,
      sentAt: row.sent_at,
      canRespond,
      status: row.status,
      customer: { name: row.customer?.name ?? '' },
      business: {
        name: row.business?.name ?? '',
        logoUrl: row.business?.logo_url ?? '',
        phone: row.business?.phone ?? '',
        email: row.business?.email ?? '',
        primaryColor: row.business?.primary_color ?? '#2563EB',
        secondaryColor: row.business?.secondary_color ?? '#F97316',
        termsConditions: row.business?.terms_conditions ?? '',
      },
      items: (row.items ?? []).map((item) => ({
        name: item.name,
        description: item.description,
        unit: item.unit,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_price),
        total: Number(item.total),
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Serviço temporariamente indisponível.' }, { status: 503 })
  }
}
