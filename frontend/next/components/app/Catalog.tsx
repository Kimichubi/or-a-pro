'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { api, buttonClass, dangerButtonClass, fieldClass, money, secondaryButtonClass } from '@/lib/client-api'
import { Loading, Notice, Page, Panel } from './Page'

type Item = { id: string; name: string; description: string; unit: string; price: number; estimatedCost: number; category: string }
type CatalogInput = Omit<Item, 'id'>
type Billing = { plan: string }
const empty: CatalogInput = { name: '', description: '', unit: 'un', price: 0, estimatedCost: 0, category: '' }

export function Catalog() {
  const [rows, setRows] = useState<Item[] | null>(null)
  const [form, setForm] = useState<CatalogInput>(empty)
  const [editing, setEditing] = useState('')
  const [error, setError] = useState('')
  const [isPaid, setIsPaid] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    Promise.all([api<Item[]>('/api/catalog'), api<Billing>('/api/billing/status')]).then(([items, billing]) => { setRows(items); setIsPaid(billing.plan !== 'free') }).catch((err) => setError(err.message))
  }, [])
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setBusy(true)
    try {
      const saved = await api<Item>(editing ? `/api/catalog/${editing}` : '/api/catalog', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(form) })
      setRows((current) => [saved, ...(current ?? []).filter((row) => row.id !== saved.id)]); setForm(empty); setEditing('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar o item.') } finally { setBusy(false) }
  }
  async function remove(id: string) {
    if (!window.confirm('Excluir este item do catálogo?')) return
    try { await api(`/api/catalog/${id}`, { method: 'DELETE' }); setRows((current) => (current ?? []).filter((row) => row.id !== id)) }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível excluir o item.') }
  }
  return <Page title="Catálogo" description="Reaproveite serviços e materiais nos seus orçamentos.">
    {error && <Notice>{error}</Notice>}
    {!isPaid && <Notice kind="info">O catálogo está disponível no plano Profissional. <Link href="/app/assinatura" className="font-semibold underline">Ver assinatura</Link></Notice>}
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.5fr)]">
      <Panel><h2 className="font-semibold text-gray-900">{editing ? 'Editar item' : 'Novo item'}</h2><form onSubmit={save} className="mt-4 space-y-3">
        <Input label="Nome" value={form.name} onChange={(name) => setForm({ ...form, name })} required maxLength={160} />
        <Input label="Descrição" value={form.description} onChange={(description) => setForm({ ...form, description })} maxLength={2000} />
        <div className="grid grid-cols-2 gap-3"><Input label="Unidade" value={form.unit} onChange={(unit) => setForm({ ...form, unit })} maxLength={40} /><Input label="Categoria" value={form.category} onChange={(category) => setForm({ ...form, category })} maxLength={100} /></div>
        <div className="grid grid-cols-2 gap-3"><NumberInput label="Preço (R$)" value={form.price} onChange={(price) => setForm({ ...form, price })} /><NumberInput label="Custo estimado" value={form.estimatedCost} onChange={(estimatedCost) => setForm({ ...form, estimatedCost })} /></div>
        <div className="flex gap-2"><button className={buttonClass} disabled={busy || !isPaid}>{busy ? 'Salvando…' : editing ? 'Salvar alterações' : 'Adicionar ao catálogo'}</button>{editing && <button type="button" className={secondaryButtonClass} onClick={() => { setEditing(''); setForm(empty) }}>Cancelar</button>}</div>
      </form></Panel>
      <Panel className="!p-0"><div className="border-b border-gray-100 p-5"><h2 className="font-semibold text-gray-900">Itens salvos</h2></div>{!rows ? <div className="p-5"><Loading /></div> : rows.length ? <div className="divide-y divide-gray-100">{rows.map((row) => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="font-medium text-gray-900">{row.name} <span className="text-xs font-normal text-gray-500">/ {row.unit}</span></p><p className="mt-1 text-sm text-gray-500">{row.category || row.description || 'Sem categoria'} · {money(row.price)}</p></div><div className="flex gap-2"><button className={secondaryButtonClass} onClick={() => { setEditing(row.id); setForm({ name: row.name, description: row.description, unit: row.unit, price: row.price, estimatedCost: row.estimatedCost, category: row.category }) }}>Editar</button><button className={dangerButtonClass} onClick={() => remove(row.id)}>Excluir</button></div></div>)}</div> : <div className="p-8 text-center text-sm text-gray-500">Seu catálogo ainda está vazio.</div>}</Panel>
    </div>
  </Page>
}

function Input({ label, value, onChange, required = false, maxLength }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; maxLength?: number }) {
  return <label className="block text-sm font-medium text-gray-700">{label}<input className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)} required={required} maxLength={maxLength} /></label>
}
function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="block text-sm font-medium text-gray-700">{label}<input className={fieldClass} type="number" min={0} step="0.01" value={value} onChange={(event) => onChange(Number(event.target.value))} required /></label>
}
