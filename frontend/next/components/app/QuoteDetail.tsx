'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, buttonClass, date, fieldClass, money, secondaryButtonClass } from '@/lib/client-api'
import { Loading, Notice, Page, Panel } from './Page'

type Quote = { id: string; slug: string; status: string; title: string; discountAmount: number; executionDays: number; validityDays: number; notes: string; paymentConditions: string; subtotal: number; total: number; createdAt: string; customer: { name: string; phone: string; email: string }; items: { id: string; name: string; description: string; unit: string; quantity: number; unitPrice: number; total: number }[]; reminders: { id: string; message: string; createdAt: string }[] }
const labels: Record<string, string> = { draft: 'Rascunho', sent: 'Enviado', viewed: 'Visualizado', approved: 'Aprovado', declined: 'Recusado', expired: 'Expirado' }

export function QuoteDetail({ id }: { id: string }) {
  const router = useRouter()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [reminder, setReminder] = useState('')
  useEffect(() => { api<Quote>(`/api/quotes/${id}`).then(setQuote).catch((err) => setError(err.message)) }, [id])
  async function send() {
    setBusy(true); setError('')
    try {
      const result = await api<{ link: string; message: string; customerPhone: string }>(`/api/quotes/${id}/send`, { method: 'POST' })
      const digits = result.customerPhone.replace(/\D/g, '')
      const whatsapp = digits ? `https://wa.me/${digits}?text=${encodeURIComponent(result.message)}` : `https://wa.me/?text=${encodeURIComponent(result.message)}`
      window.open(whatsapp, '_blank', 'noopener,noreferrer')
      setQuote((current) => current ? { ...current, status: 'sent' } : current)
      if (!digits) setError(`Link copiado para enviar: ${result.link}`)
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível enviar.') } finally { setBusy(false) }
  }
  async function setStatus(status: string) {
    setBusy(true); setError('')
    try { await api(`/api/quotes/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }); setQuote((current) => current ? { ...current, status } : current) }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível alterar o status.') } finally { setBusy(false) }
  }
  async function saveReminder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('')
    try { const saved = await api<{ id: string; message: string; createdAt: string }>(`/api/quotes/${id}/reminders`, { method: 'POST', body: JSON.stringify({ message: reminder }) }); setQuote((current) => current ? { ...current, reminders: [saved, ...current.reminders] } : current); setReminder('') }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível registrar o lembrete.') }
  }
  async function remove() {
    if (!window.confirm('Excluir este orçamento?')) return
    try { await api(`/api/quotes/${id}`, { method: 'DELETE' }); router.push('/app/orcamentos'); router.refresh() }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível excluir.') }
  }
  return <Page title={quote?.title ?? 'Orçamento'} description={quote ? `${quote.customer.name} · criado em ${date(quote.createdAt)} · ${labels[quote.status]}` : 'Detalhes da proposta'}>
    {error && <Notice>{error}</Notice>}
    {!quote ? <Loading /> : <>
      <div className="mb-5 flex flex-wrap gap-2"><button className={buttonClass} disabled={busy || ['approved', 'declined', 'expired'].includes(quote.status)} onClick={send}>{busy ? 'Aguarde…' : 'Enviar pelo WhatsApp'}</button><Link className={secondaryButtonClass} href={`/app/orcamentos/${id}/editar`}>Editar</Link><a className={secondaryButtonClass} href={`/api/quotes/${id}/pdf`} target="_blank" rel="noreferrer">Baixar PDF</a><button className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50" onClick={remove}>Excluir</button></div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
        <div className="space-y-5"><Panel><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-gray-900">Itens do orçamento</h2><p className="mt-1 text-sm text-gray-500">Cliente: {quote.customer.name}</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-800">{labels[quote.status] ?? quote.status}</span></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="border-b border-gray-200 text-xs uppercase text-gray-500"><tr><th className="py-3">Descrição</th><th className="py-3">Qtd.</th><th className="py-3">Preço</th><th className="py-3 text-right">Total</th></tr></thead><tbody className="divide-y divide-gray-100">{quote.items.map((item) => <tr key={item.id}><td className="py-3"><p className="font-medium text-gray-900">{item.name}</p>{item.description && <p className="mt-1 text-xs text-gray-500">{item.description}</p>}</td><td className="py-3">{item.quantity} {item.unit}</td><td className="py-3">{money(item.unitPrice)}</td><td className="py-3 text-right font-medium">{money(item.total)}</td></tr>)}</tbody></table></div><div className="ml-auto mt-4 max-w-xs space-y-2 border-t border-gray-100 pt-4 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{money(quote.subtotal)}</span></div><div className="flex justify-between"><span>Desconto</span><span>− {money(quote.discountAmount)}</span></div><div className="flex justify-between border-t border-gray-100 pt-3 text-base font-bold"><span>Total</span><span>{money(quote.total)}</span></div></div></Panel>
          {(quote.notes || quote.paymentConditions) && <Panel><h2 className="font-semibold text-gray-900">Condições</h2>{quote.paymentConditions && <p className="mt-3 text-sm text-gray-700"><strong>Pagamento:</strong> {quote.paymentConditions}</p>}{quote.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{quote.notes}</p>}</Panel>}
        </div>
        <div className="space-y-5"><Panel><h2 className="font-semibold text-gray-900">Cliente</h2><p className="mt-3 font-medium">{quote.customer.name}</p><p className="mt-1 text-sm text-gray-600">{quote.customer.phone}</p><p className="mt-1 text-sm text-gray-600">{quote.customer.email}</p><a href={`/orcamento/${quote.slug}`} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:underline">Abrir link público</a></Panel>
          <Panel><h2 className="font-semibold text-gray-900">Atualizar status</h2><label className="mt-3 block text-sm text-gray-600">Escolha um status<select className={fieldClass} value={quote.status} onChange={(event) => setStatus(event.target.value)} disabled={busy}>{Object.entries(labels).filter(([value]) => value !== 'draft').map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></Panel>
          <Panel><h2 className="font-semibold text-gray-900">Histórico de lembretes</h2><form className="mt-3" onSubmit={saveReminder}><textarea className={fieldClass} rows={3} required maxLength={2000} value={reminder} onChange={(event) => setReminder(event.target.value)} placeholder="Anote um contato de acompanhamento" /><button className={`${secondaryButtonClass} mt-2`}>Registrar lembrete</button></form><div className="mt-4 space-y-3">{quote.reminders.map((entry) => <div key={entry.id} className="border-t border-gray-100 pt-3"><p className="whitespace-pre-wrap text-sm text-gray-700">{entry.message}</p><p className="mt-1 text-xs text-gray-500">{date(entry.createdAt)}</p></div>)}</div></Panel>
        </div>
      </div>
    </>}
  </Page>
}
