import client from './client'
import type {
  AwaitingQuote,
  QuoteDetail,
  QuoteItemInput,
  QuoteStatus,
  QuoteSummary,
} from './types'

export interface QuotePayload {
  customerId: string
  title: string
  discountAmount: number
  executionDays: number
  validityDays: number
  notes: string
  paymentConditions: string
  items: QuoteItemInput[]
}

export async function listQuotes(status = ''): Promise<QuoteSummary[]> {
  const res = await client.get('/quotes/', { params: { status } })
  return res.data
}

export async function listAwaiting(): Promise<AwaitingQuote[]> {
  const res = await client.get('/quotes/awaiting')
  return res.data
}

export async function getQuote(id: string): Promise<QuoteDetail> {
  const res = await client.get(`/quotes/${id}`)
  return res.data
}

export async function createQuote(data: QuotePayload): Promise<QuoteDetail> {
  const res = await client.post('/quotes/', data)
  return res.data
}

export async function updateQuote(id: string, data: QuotePayload): Promise<QuoteDetail> {
  const res = await client.put(`/quotes/${id}`, data)
  return res.data
}

export async function deleteQuote(id: string): Promise<void> {
  await client.delete(`/quotes/${id}`)
}

export async function setQuoteStatus(id: string, status: QuoteStatus): Promise<void> {
  await client.post(`/quotes/${id}/status`, { status })
}

export async function sendQuote(id: string): Promise<{ link: string; message: string }> {
  const res = await client.post(`/quotes/${id}/send`)
  return res.data
}

export async function createReminder(id: string, message: string): Promise<{ message: string }> {
  const res = await client.post(`/quotes/${id}/reminders`, { message })
  return res.data
}

export function quotePdfUrl(id: string): string {
  return `/api/quotes/${id}/pdf`
}

export async function getPublicQuote(slug: string): Promise<QuoteDetail> {
  const res = await client.get(`/public/quotes/${slug}`)
  return res.data
}

export async function approveQuote(slug: string, comment: string): Promise<void> {
  await client.post(`/public/quotes/${slug}/approve`, { comment })
}

export async function declineQuote(slug: string, comment: string): Promise<void> {
  await client.post(`/public/quotes/${slug}/decline`, { comment })
}
