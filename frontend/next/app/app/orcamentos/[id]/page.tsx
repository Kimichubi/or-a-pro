import { QuoteDetail } from '@/components/app/QuoteDetail'

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <QuoteDetail id={id} />
}
