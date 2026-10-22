import { NextResponse, type NextRequest } from 'next/server'
import Stripe from 'stripe'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getProfessionalPriceId, getStripeClient } from '@/lib/stripe'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const stripe = getStripeClient()
  const professionalPriceId = getProfessionalPriceId()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  const signature = request.headers.get('stripe-signature')
  if (!stripe || !professionalPriceId || !webhookSecret || !signature) return NextResponse.json({ error: 'Webhook não configurado.' }, { status: 503 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Assinatura do webhook inválida.' }, { status: 400 })
  }

  if (!event.type.startsWith('customer.subscription.') && event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  try {
    const admin = createSupabaseAdminClient()
    let subscription: Stripe.Subscription | null = null
    let customerId = ''
    let userId = ''
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      customerId = typeof session.customer === 'string' ? session.customer : ''
      userId = session.metadata?.user_id ?? session.client_reference_id ?? ''
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
      if (subscriptionId) subscription = await stripe.subscriptions.retrieve(subscriptionId)
    } else {
      subscription = event.data.object as Stripe.Subscription
      customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
      userId = subscription.metadata.user_id ?? ''
    }
    if (!userId && customerId) {
      const { data } = await admin.from('billing_accounts').select('user_id').eq('stripe_customer_id', customerId).maybeSingle()
      userId = data?.user_id ?? ''
    }

    const status = subscription?.status ?? 'inactive'
    const priceId = subscription?.items.data.find((item) => item.price.id === professionalPriceId)?.price.id ?? ''
    if (!priceId) return NextResponse.json({ received: true })
    const plan = status === 'active' || status === 'trialing' ? 'professional' : 'free'
    const { error } = await admin.rpc('apply_stripe_subscription_event', {
      p_event_id: event.id,
      p_event_type: event.type,
      p_event_created: event.created,
      p_user_id: userId || null,
      p_customer_id: customerId,
      p_subscription_id: subscription?.id ?? '',
      p_price_id: priceId,
      p_status: status,
      p_plan: plan,
    })
    if (error) throw error
    return NextResponse.json({ received: true })
  } catch {
    return NextResponse.json({ error: 'Não foi possível processar o evento.' }, { status: 500 })
  }
}
