'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { api, buttonClass, fieldClass, money, secondaryButtonClass } from '@/lib/client-api'
import { Loading, Notice, Page, Panel } from './Page'

type Customer = { id: string; name: string }
type CatalogItem = { id: string; name: string; description: string; unit: string; price: number }
type Line = { catalogItemId: string | null; name: string; description: string; unit: string; quantity: number; unitPrice: number }
type QuoteDetail = { id: string; title: string; customerId: string; discountAmount: number; executionDays: number; validityDays: number; notes: string; paymentConditions: string; items: (Line & { id: string })[] }

export function QuoteEditor({ quoteId }: { quoteId?: string }) {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [customerId, setCustomerId] = useState('')
  const [title, setTitle] = useState('Orçamento')
  const [discountAmount, setDiscountAmount] = useState(0)
  const [executionDays, setExecutionDays] = useState(0)
  const [validityDays, setValidityDays] = useState(7)
  const [notes, setNotes] = useState('')
  const [paymentConditions, setPaymentConditions] = useState('')
  const [items, setItems] = useState<Line[]>([{ catalogItemId: null, name: '', description: '', unit: 'un', quantity: 1, unitPrice: 0 }])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    Promise.all([api<Customer[]>('/api/customers'), api<CatalogItem[]>('/api/catalog').catch(() => [])]).then(async ([customerRows, catalogRows]) => {
      setCustomers(customerRows); setCatalog(catalogRows)
      if (quoteId) {
        const quote = await api<QuoteDetail>(`/api/quotes/${quoteId}`)
        setCustomerId(quote.customerId); setTitle(quote.title); setDiscountAmount(quote.discountAmount); setExecutionDays(quote.executionDays); setValidityDays(quote.validityDays)
        setNotes(quote.notes); setPaymentConditions(quote.paymentConditions)
        setItems(quote.items.map(({ catalogItemId, name, description, unit, quantity, unitPrice }) => ({ catalogItemId, name, description, unit, quantity, unitPrice })))
      }
      setReady(true)
    }).catch((err) => setError(err.message))
  }, [quoteId])
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0), [items])
  const total = Math.max(0, subtotal - Number(discountAmount || 0))

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setBusy(true)
    try {
      const quote = await api<{ id: string }>(quoteId ? `/api/quotes/${quoteId}` : '/api/quotes', { method: quoteId ? 'PUT' : 'POST', body: JSON.stringify({ customerId, title, discountAmount: Number(discountAmount), executionDays: Number(executionDays), validityDays: Number(validityDays), notes, paymentConditions, items: items.map((item) => ({ ...item, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) })) }) })
      router.push(`/app/orcamentos/${quote.id}`); router.refresh()
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar o orçamento.') } finally { setBusy(false) }
  }

  function updateLine(index: number, patch: Partial<Line>) { setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)) }
  function chooseCatalog(index: number, id: string) {
    const selected = catalog.find((item) => item.id === id)
    updateLine(index, selected ? { catalogItemId: selected.id, name: selected.name, description: selected.description, unit: selected.unit, unitPrice: selected.price } : { catalogItemId: null })
  }

  return <Page title={quoteId ? 'Editar orçamento' : 'Novo orçamento'} description="Revise cliente, itens, prazos e condições antes de salvar.">
    {error && <Notice>{error}</Notice>}
    {!ready ? <Loading /> : <form onSubmit={save} className="space-y-5">
      <Panel><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-gray-700">Cliente<select className={fieldClass} required value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">Selecione um cliente</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name}</option>)}</select></label><label className="text-sm font-medium text-gray-700">Título<input className={fieldClass} required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} /></label></div>
        {!customers.length && <Notice kind="info">Cadastre um cliente antes de criar o orçamento.</Notice>}
      </Panel>
      <Panel><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-gray-900">Serviços e materiais</h2><p className="mt-1 text-sm text-gray-500">Selecione do catálogo ou digite um item personalizado.</p></div><button type="button" className={secondaryButtonClass} onClick={() => setItems((current) => [...current, { catalogItemId: null, name: '', description: '', unit: 'un', quantity: 1, unitPrice: 0 }])}>Adicionar item</button></div>
        <div className="mt-4 space-y-4">{items.map((item, index) => <div className="rounded-xl border border-gray-200 p-4" key={index}>
          <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_100px_120px_140px_auto] md:items-end">
            <label className="text-xs font-semibold text-gray-500">Usar do catálogo<select className={fieldClass} value={item.catalogItemId ?? ''} onChange={(event) => chooseCatalog(index, event.target.value)}><option value="">Item personalizado</option>{catalog.map((option) => <option value={option.id} key={option.id}>{option.name}</option>)}</select></label>
            <label className="text-xs font-semibold text-gray-500">Descrição<input className={fieldClass} required maxLength={200} value={item.name} onChange={(event) => updateLine(index, { name: event.target.value })} /></label>
            <label className="text-xs font-semibold text-gray-500">Unidade<input className={fieldClass} value={item.unit} maxLength={40} onChange={(event) => updateLine(index, { unit: event.target.value })} /></label>
            <label className="text-xs font-semibold text-gray-500">Quantidade<input className={fieldClass} type="number" required min="0.01" step="0.01" value={item.quantity} onChange={(event) => updateLine(index, { quantity: Number(event.target.value) })} /></label>
            <label className="text-xs font-semibold text-gray-500">Preço unitário<input className={fieldClass} type="number" required min="0" step="0.01" value={item.unitPrice} onChange={(event) => updateLine(index, { unitPrice: Number(event.target.value) })} /></label>
            <button type="button" className="pb-2 text-sm font-semibold text-red-700 hover:underline disabled:opacity-40" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remover</button>
          </div>
          <label className="mt-3 block text-xs font-semibold text-gray-500">Detalhes<textarea className={fieldClass} rows={2} maxLength={2000} value={item.description} onChange={(event) => updateLine(index, { description: event.target.value })} /></label>
          <p className="mt-2 text-right text-sm font-semibold text-gray-800">Total do item: {money(item.quantity * item.unitPrice)}</p>
        </div>)}</div>
        <div className="mt-5 ml-auto max-w-sm space-y-2 border-t border-gray-100 pt-4 text-sm"><div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{money(subtotal)}</span></div><label className="flex items-center justify-between gap-4 text-gray-600">Desconto<input className={`${fieldClass} mt-0 max-w-36 text-right`} type="number" min="0" max={subtotal} step="0.01" value={discountAmount} onChange={(event) => setDiscountAmount(Number(event.target.value))} /></label><div className="flex justify-between border-t border-gray-100 pt-3 text-base font-bold text-gray-900"><span>Total</span><span>{money(total)}</span></div></div>
      </Panel>
      <Panel><h2 className="font-semibold text-gray-900">Prazos e condições</h2><div className="mt-4 grid gap-4 sm:grid-cols-3"><NumberField label="Prazo de execução (dias)" value={executionDays} onChange={setExecutionDays} min={0} max={3650} /><NumberField label="Validade (dias)" value={validityDays} onChange={setValidityDays} min={1} max={365} /><label className="text-sm font-medium text-gray-700">Condições de pagamento<input className={fieldClass} maxLength={2000} value={paymentConditions} onChange={(event) => setPaymentConditions(event.target.value)} placeholder="Ex.: 50% na entrada" /></label></div><label className="mt-4 block text-sm font-medium text-gray-700">Observações<textarea className={fieldClass} rows={3} maxLength={5000} value={notes} onChange={(event) => setNotes(event.target.value)} /></label></Panel>
      <div className="flex justify-end gap-3"><button type="button" className={secondaryButtonClass} onClick={() => router.back()}>Cancelar</button><button className={buttonClass} disabled={busy || !customers.length}>{busy ? 'Salvando…' : 'Salvar orçamento'}</button></div>
    </form>}
  </Page>
}

function NumberField({ label, value, onChange, min, max }: { label: string; value: number; onChange: (value: number) => void; min: number; max: number }) {
  return <label className="text-sm font-medium text-gray-700">{label}<input className={fieldClass} type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>
}
