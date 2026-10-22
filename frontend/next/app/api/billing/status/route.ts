import { NextResponse } from 'next/server'
import { getApiContext, isApiError } from '@/lib/api/context'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getProfessionalPriceId, getStripeClient } from '@/lib/stripe'

export async function GET() {
  const context = await getApiContext()
  if (isApiError(context)) return context
  try {
    const admin = createSupabaseAdminClient()
    const month = new Date()
    month.setUTCDate(1)
    const monthStart = month.toISOString().slice(0, 10)
    const [{ data: billing }, { data: usage }] = await Promise.all([
      admin.from('billing_accounts').select('plan, subscription_status, stripe_customer_id').eq('user_id', context.user.id).maybeSingle(),
      admin.from('monthly_quote_usage').select('quotes_created').eq('user_id', context.user.id).eq('month_start', monthStart).maybeSingle(),
    ])
    if (!billing) return NextResponse.json({ error: 'Não foi possível carregar a assinatura.' }, { status: 500 })
    const plan = billing.plan === 'company' ? 'company' : billing.plan === 'professional' ? 'professional' : 'free'
    return NextResponse.json({
      plan,
      subscriptionStatus: billing.subscription_status,
      quotesUsed: usage?.quotes_created ?? 0,
      quotesLimit: plan === 'free' ? 5 : null,
      canManage: Boolean(billing.stripe_customer_id),
      billingEnabled: Boolean(getStripeClient() && getProfessionalPriceId()),
    })
  } catch {
    return NextResponse.json({ error: 'A configuração segura do Supabase ainda não está completa.' }, { status: 503 })
  }
}
