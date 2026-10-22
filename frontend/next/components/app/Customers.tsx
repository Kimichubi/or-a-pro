'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { api, buttonClass, date, dangerButtonClass, fieldClass, secondaryButtonClass } from '@/lib/client-api'
import { Loading, Notice, Page, Panel } from './Page'

type Customer = { id: string; name: string; phone: string; email: string; document: string; serviceAddress: string; notes: string; createdAt: string }
type CustomerInput = Omit<Customer, 'id' | 'createdAt'>
const empty: CustomerInput = { name: '', phone: '', email: '', document: '', serviceAddress: '', notes: '' }

export function Customers() {
  const [rows, setRows] = useState<Customer[] | null>(null)
  const [form, setForm] = useState<CustomerInput>(empty)
  const [editing, setEditing] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    api<Customer[]>(`/api/customers?search=${encodeURIComponent(search)}`)
      .then((data) => { if (active) setRows(data) })
      .catch((err) => { if (active) setError(err.message) })
    return () => { active = false }
  }, [search])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setBusy(true)
    try {
      const saved = await api<Customer>(editing ? `/api/customers/${editing}` : '/api/customers', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(form) })
      setRows((current) => [saved, ...(current ?? []).filter((row) => row.id !== saved.id)])
      setForm(empty); setEditing('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar o cliente.') } finally { setBusy(false) }
  }

  async function remove(id: string) {
    if (!window.confirm('Excluir este cliente? Orçamentos associados também podem ser removidos.')) return
    try { await api(`/api/customers/${id}`, { method: 'DELETE' }); setRows((current) => (current ?? []).filter((row) => row.id !== id)) }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível excluir o cliente.') }
  }

  return <Page title="Clientes" description="Guarde os dados de contato para criar orçamentos mais rápido.">
    {error && <Notice>{error}</Notice>}
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.5fr)]">
      <Panel><h2 className="font-semibold text-gray-900">{editing ? 'Editar cliente' : 'Novo cliente'}</h2>
        <form className="mt-4 space-y-3" onSubmit={save}>
          <Field label="Nome" value={form.name} onChange={(name) => setForm({ ...form, name })} required maxLength={160} />
          <Field label="Telefone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} maxLength={40} />
          <Field label="E-mail" value={form.email} onChange={(email) => setForm({ ...form, email })} type="email" maxLength={254} />
          <Field label="CPF ou CNPJ" value={form.document} onChange={(document) => setForm({ ...form, document })} maxLength={30} />
          <Field label="Endereço do serviço" value={form.serviceAddress} onChange={(serviceAddress) => setForm({ ...form, serviceAddress })} maxLength={300} />
          <label className="block text-sm font-medium text-gray-700">Observações<textarea className={fieldClass} rows={3} maxLength={2000} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
          <div className="flex gap-2"><button className={buttonClass} disabled={busy}>{busy ? 'Salvando…' : editing ? 'Salvar alterações' : 'Cadastrar cliente'}</button>{editing && <button type="button" className={secondaryButtonClass} onClick={() => { setEditing(''); setForm(empty) }}>Cancelar</button>}</div>
        </form>
      </Panel>
      <Panel className="!p-0"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5"><div><h2 className="font-semibold text-gray-900">Sua base de clientes</h2><p className="mt-1 text-xs text-gray-500">{rows?.length ?? 0} clientes nesta busca</p></div><input className={`${fieldClass} mt-0 w-56`} placeholder="Buscar por nome" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        {!rows ? <div className="p-5"><Loading /></div> : rows.length ? <div className="divide-y divide-gray-100">{rows.map((row) => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="font-medium text-gray-900">{row.name}</p><p className="mt-1 text-sm text-gray-500">{[row.phone, row.email].filter(Boolean).join(' · ') || 'Sem contato'} · desde {date(row.createdAt)}</p></div><div className="flex gap-2"><button className={secondaryButtonClass} onClick={() => { setEditing(row.id); setForm({ name: row.name, phone: row.phone, email: row.email, document: row.document, serviceAddress: row.serviceAddress, notes: row.notes }) }}>Editar</button><button className={dangerButtonClass} onClick={() => remove(row.id)}>Excluir</button></div></div>)}</div> : <div className="p-8 text-center text-sm text-gray-500">Nenhum cliente encontrado.</div>}
      </Panel>
    </div>
  </Page>
}

function Field({ label, value, onChange, required = false, type = 'text', maxLength }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; maxLength?: number }) {
  return <label className="block text-sm font-medium text-gray-700">{label}<input className={fieldClass} type={type} value={value} required={required} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} /></label>
}
