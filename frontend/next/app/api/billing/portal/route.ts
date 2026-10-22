import { NextResponse } from 'next/server'
import { getApiContext, isApiError } from '@/lib/api/context'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getAppUrl, getStripeClient } from '@/lib/stripe'

export async function POST() {
  const context = await getApiContext()
  if (isApiError(context)) return context
  const stripe = getStripeClient()
  const appUrl = getAppUrl()
  if (!stripe || !appUrl) return NextResponse.json({ error: 'O portal de cobrança ainda não está configurado.' }, { status: 503 })
  try {
    const { data: billing } = await createSupabaseAdminClient().from('billing_accounts').select('stripe_customer_id').eq('user_id', context.user.id).maybeSingle()
    if (!billing?.stripe_customer_id) return NextResponse.json({ error: 'Ainda não há uma assinatura para gerenciar.' }, { status: 409 })
    const session = await stripe.billingPortal.sessions.create({ customer: billing.stripe_customer_id, return_url: `${appUrl}/app/assinatura` })
    return NextResponse.json({ url: session.url })
  } catch {
    return NextResponse.json({ error: 'Não foi possível abrir o portal de cobrança.' }, { status: 502 })
  }
}
