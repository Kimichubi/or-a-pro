import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { getApiContext, isApiError } from '@/lib/api/context'
import { isResponse, readJson } from '@/lib/api/validation'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getAppUrl, getProfessionalPriceId, getStripeClient } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const context = await getApiContext()
  if (isApiError(context)) return context
  const body = await readJson(request)
  if (isResponse(body)) return body
  if (!z.object({ plan: z.literal('professional') }).strict().safeParse(body).success) return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 })
  const stripe = getStripeClient()
  const price = getProfessionalPriceId()
  const appUrl = getAppUrl()
  if (!stripe || !price || !appUrl) return NextResponse.json({ error: 'O pagamento ainda não está configurado.' }, { status: 503 })
  const admin = (() => {
    try { return createSupabaseAdminClient() } catch { return null }
  })()
  if (!admin) return NextResponse.json({ error: 'O pagamento ainda não está configurado.' }, { status: 503 })
  let requestKey = ''
  try {
    const { data: billing } = await admin.from('billing_accounts').select('plan, subscription_status, stripe_subscription_id').eq('user_id', context.user.id).maybeSingle()
    if (billing?.plan === 'professional' || billing?.plan === 'company') return NextResponse.json({ error: 'Sua conta já está em um plano pago.' }, { status: 409 })
    if (billing?.stripe_subscription_id && ['active', 'trialing', 'past_due', 'unpaid'].includes(billing.subscription_status)) {
      return NextResponse.json({ error: 'Já existe uma assinatura associada. Use o portal de cobrança para gerenciá-la.' }, { status: 409 })
    }

    const { data: initialClaim, error: claimError } = await admin.rpc('claim_billing_checkout', { p_user_id: context.user.id, p_force: false })
    if (claimError || !initialClaim) throw new Error('checkout claim unavailable')
    let claimData = initialClaim as { state: 'claimed' | 'ready' | 'busy'; requestKey?: string; sessionId?: string; url?: string }
    if (claimData.state === 'ready' && claimData.sessionId) {
      const existing = await stripe.checkout.sessions.retrieve(claimData.sessionId)
      if (existing.status === 'open' && existing.url) return NextResponse.json({ url: existing.url })
      const forcedClaim = await admin.rpc('claim_billing_checkout', { p_user_id: context.user.id, p_force: true, p_expected_session_id: claimData.sessionId })
      if (forcedClaim.error || !forcedClaim.data) throw new Error('checkout refresh unavailable')
      claimData = forcedClaim.data as typeof claimData
      if (claimData.state === 'ready' && claimData.sessionId) {
        const current = await stripe.checkout.sessions.retrieve(claimData.sessionId)
        if (current.status === 'open' && current.url) return NextResponse.json({ url: current.url })
        const retryClaim = await admin.rpc('claim_billing_checkout', { p_user_id: context.user.id, p_force: true, p_expected_session_id: claimData.sessionId })
        if (retryClaim.error || !retryClaim.data) throw new Error('checkout refresh unavailable')
        claimData = retryClaim.data as typeof claimData
      }
    }
    if (claimData.state === 'busy') return NextResponse.json({ error: 'Já estamos preparando o pagamento. Tente novamente em instantes.' }, { status: 409 })
    if (claimData.state !== 'claimed' || !claimData.requestKey) throw new Error('checkout claim invalid')
    requestKey = claimData.requestKey
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      customer_email: context.user.email,
      client_reference_id: context.user.id,
      metadata: { user_id: context.user.id, plan: 'professional' },
      subscription_data: { metadata: { user_id: context.user.id, plan: 'professional' } },
      success_url: `${appUrl}/app/assinatura?checkout=success`,
      cancel_url: `${appUrl}/app/assinatura?checkout=cancelled`,
    }, { idempotencyKey: `checkout-${requestKey}` })
    if (!session.url) {
      await admin.rpc('release_billing_checkout', { p_user_id: context.user.id, p_request_key: requestKey })
      return NextResponse.json({ error: 'O Stripe não retornou um link de pagamento.' }, { status: 502 })
    }
    const { data: completed, error: completeError } = await admin.rpc('complete_billing_checkout', {
      p_user_id: context.user.id,
      p_request_key: requestKey,
      p_session_id: session.id,
      p_checkout_url: session.url,
      p_expires_at: new Date(session.expires_at * 1000).toISOString(),
    })
    if (completeError || !completed) {
      await admin.rpc('release_billing_checkout', { p_user_id: context.user.id, p_request_key: requestKey })
      return NextResponse.json({ error: 'Não foi possível registrar a sessão de pagamento.' }, { status: 503 })
    }
    return NextResponse.json({ url: session.url })
  } catch {
    if (requestKey) await admin.rpc('release_billing_checkout', { p_user_id: context.user.id, p_request_key: requestKey })
    return NextResponse.json({ error: 'Não foi possível iniciar o pagamento.' }, { status: 502 })
  }
}
