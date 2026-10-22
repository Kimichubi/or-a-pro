'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { api, fieldClass, money } from '@/lib/client-api'
import { Loading, Notice, Panel } from './Page'

type Quote = { title: string; discountAmount: number; executionDays: number; validityDays: number; notes: string; paymentConditions: string; subtotal: number; total: number; createdAt: string; sentAt: string | null; canRespond: boolean; status: string; customer: { name: string }; business: { name: string; logoUrl: string; phone: string; email: string; primaryColor: string; secondaryColor: string; termsConditions: string }; items: { name: string; description: string; unit: string; quantity: number; unitPrice: number; total: number }[] }

export function PublicQuote({ slug }: { slug: string }) {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [error, setError] = useState('')
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [decision, setDecision] = useState('')
  useEffect(() => { api<Quote>(`/api/public/quotes/${slug}`).then(setQuote).catch((err) => setError(err.message)) }, [slug])
  async function respond(action: 'approve' | 'decline') {
    setBusy(true); setError('')
    try { await api(`/api/public/quotes/${slug}/${action}`, { method: 'POST', body: JSON.stringify({ comment }) }); setDecision(action); setQuote((current) => current ? { ...current, canRespond: false, status: action === 'approve' ? 'approved' : 'declined' } : current) }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível registrar sua resposta.') } finally { setBusy(false) }
  }
  if (!quote && !error) return <main className="mx-auto max-w-3xl px-4 py-12"><Loading /></main>
  if (!quote) return <main className="mx-auto max-w-3xl px-4 py-12"><Notice>{error || 'Orçamento não encontrado.'}</Notice></main>
  const accepted = quote.status === 'approved'
  const declined = quote.status === 'declined'
  return <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
    {error && <Notice>{error}</Notice>}
    <Panel className={`hero-quote-card overflow-hidden !p-0 ${accepted ? 'hero-quote-card--approved' : declined ? 'hero-quote-card--declined' : ''}`}>
      <header className="px-6 py-7 text-white sm:px-9" style={{ backgroundColor: quote.business.primaryColor || '#155D61', borderBottom: `4px solid ${quote.business.secondaryColor || '#DD8F28'}` }}>
        <div className="flex items-center gap-4">{quote.business.logoUrl && <Image src={quote.business.logoUrl} alt="" width={56} height={56} unoptimized className="size-14 rounded-xl bg-white object-contain p-1" />}<div><p className="text-lg font-bold">{quote.business.name}</p><p className="mt-1 text-sm text-white/80">{[quote.business.phone, quote.business.email].filter(Boolean).join(' · ')}</p></div></div>
      </header>
      <div className="p-6 sm:p-9"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Orçamento</p><h1 className="mt-1 font-display text-2xl font-bold text-gray-900">{quote.title}</h1></div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">Válido por {quote.validityDays} dias</span></div>
        <p className="mt-4 text-sm text-gray-600">Olá, {quote.customer.name}. Confira os serviços e valores desta proposta.</p>
        <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="border-b border-gray-200 text-xs uppercase text-gray-500"><tr><th className="py-3">Descrição</th><th className="py-3">Unid.</th><th className="py-3 text-right">Qtd.</th><th className="py-3 text-right">Preço</th><th className="py-3 text-right">Total</th></tr></thead><tbody className="divide-y divide-gray-100">{quote.items.map((item, index) => <tr key={`${item.name}-${index}`}><td className="py-3"><p className="font-medium text-gray-900">{item.name}</p>{item.description && <p className="mt-1 text-xs text-gray-500">{item.description}</p>}</td><td className="py-3">{item.unit}</td><td className="py-3 text-right">{item.quantity}</td><td className="py-3 text-right">{money(item.unitPrice)}</td><td className="py-3 text-right font-medium">{money(item.total)}</td></tr>)}</tbody></table></div>
        <div className="ml-auto mt-4 max-w-xs space-y-2 text-sm"><div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{money(quote.subtotal)}</span></div><div className="flex justify-between text-gray-600"><span>Desconto</span><span>− {money(quote.discountAmount)}</span></div><div className="flex justify-between border-t border-gray-200 pt-3 text-lg font-bold text-gray-900"><span>Total</span><span>{money(quote.total)}</span></div></div>
        {(quote.paymentConditions || quote.executionDays > 0 || quote.notes || quote.business.termsConditions) && <div className="mt-6 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">{quote.paymentConditions && <p><strong>Pagamento:</strong> {quote.paymentConditions}</p>}{quote.executionDays > 0 && <p className="mt-2"><strong>Execução:</strong> {quote.executionDays} dias</p>}{quote.notes && <p className="mt-2 whitespace-pre-wrap">{quote.notes}</p>}{quote.business.termsConditions && <p className="mt-3 whitespace-pre-wrap border-t border-gray-200 pt-3">{quote.business.termsConditions}</p>}</div>}
        {decision && <div className="quote-decision mt-6 rounded-xl p-4 text-center font-semibold">{decision === 'approve' ? 'Você aprovou este orçamento. Obrigado!' : 'Sua resposta foi registrada. Obrigado pelo retorno.'}</div>}
        {!decision && quote.canRespond ? <div className="mt-7 border-t border-gray-100 pt-6"><label className="block text-sm font-medium text-gray-700">Comentário (opcional)<textarea className={fieldClass} rows={2} maxLength={2000} value={comment} onChange={(event) => setComment(event.target.value)} /></label><div className="mt-4 grid gap-3 sm:grid-cols-2"><button className="quote-action quote-action--approve" disabled={busy} onClick={() => respond('approve')}>{busy ? 'Enviando…' : 'Aprovar orçamento'}</button><button className="quote-action quote-action--decline" disabled={busy} onClick={() => respond('decline')}>Recusar orçamento</button></div></div> : !decision && <Notice kind="info">{accepted ? 'Este orçamento foi aprovado.' : declined ? 'Este orçamento foi recusado.' : 'O prazo para responder a este orçamento terminou.'}</Notice>}
        <p className="mt-6 text-center text-xs text-gray-500">Enviado com OrçaPro</p>
      </div>
    </Panel>
  </main>
}
