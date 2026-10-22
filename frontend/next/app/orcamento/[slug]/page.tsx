import type { Metadata } from 'next'
import { PublicQuote } from '@/components/app/PublicQuote'

export const metadata: Metadata = { title: 'Orçamento | OrçaPro', robots: { index: false, follow: false } }

export default async function PublicQuotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <PublicQuote slug={slug} />
}
