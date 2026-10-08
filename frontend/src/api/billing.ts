import client from './client'
import type { BillingStatus } from './types'

export async function getBillingStatus() {
  const res = await client.get<BillingStatus>('/billing/status')
  return res.data
}

export async function createCheckout(plan: 'professional') {
  const res = await client.post<{ url: string }>('/billing/checkout', { plan })
  return res.data.url
}

export async function createBillingPortal() {
  const res = await client.post<{ url: string }>('/billing/portal')
  return res.data.url
}
