import 'server-only'
import Stripe from 'stripe'

let stripe: Stripe | null = null

export function getStripeClient() {
  const secret = process.env.STRIPE_SECRET_KEY?.trim()
  if (!secret) return null
  if (!stripe) stripe = new Stripe(secret)
  return stripe
}

export function getProfessionalPriceId() {
  return process.env.STRIPE_PRICE_PROFESSIONAL?.trim() || null
}

export function getAppUrl() {
  const raw = process.env.APP_URL?.trim()
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' && url.hostname !== 'localhost') return null
    return url.origin
  } catch {
    return null
  }
}
