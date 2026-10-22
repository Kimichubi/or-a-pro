'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { api, buttonClass, fieldClass, money, secondaryButtonClass } from '@/lib/client-api'
import { Loading, Notice, Page, Panel } from './Page'

type Overview = { accounts: number; businesses: number; customers: number; quotes: number; approvedSum: number }
type BusinessRow = { businessId: string; businessName: string; ownerName: string; ownerEmail: string; email: string; phone: string; customerCount: number; quoteCount: number }
type CustomerRow = { id: string; businessId: string; name: string; phone: string; email: string; document: string; serviceAddress: string; notes: string; businessName: string; ownerEmail: string }
type CustomerInput = Pick<CustomerRow, 'name' | 'phone' | 'email' | 'document' | 'serviceAddress' | 'notes'>

export function Admin() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [businesses, setBusinesses] = useState<BusinessRow[]>([])
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<CustomerRow | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    Promise.all([
      api<Overview>('/api/admin/overview'),
      api<BusinessRow[]>('/api/admin/businesses'),
      api<CustomerRow[]>('/api/admin/customers'),
    ]).then(([stats, businessRows, customerRows]) => { setOverview(stats); setBusinesses(businessRows); setCustomers(customerRows) }).catch((err) => setError(err.message))
  }, [])
  const filteredBusinesses = businesses.filter((row) => `${row.businessName} ${row.ownerName} ${row.ownerEmail}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))
  const filteredCustomers = customers.filter((row) => `${row.name} ${row.email} ${row.businessName} ${row.ownerEmail}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing) return
    setBusy(true); setError('')
    const payload: CustomerInput = { name: editing.name, phone: editing.phone, email: editing.email, document: editing.document, serviceAddress: editing.serviceAddress, notes: editing.notes }
    try { await api(`/api/admin/customers/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) }); setCustomers((rows) => rows.map((row) => row.id === editing.id ? { ...row, ...payload } : row)); setEditing(null) }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível atualizar o cliente.') } finally { setBusy(false) }
  }
  return <Page title="Administração" description="Visão geral da plataforma e suporte a contas.">
    {error && <Notice>{error}</Notice>}
    {!overview ? <Loading /> : <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[['Contas', overview.accounts], ['Negócios', overview.businesses], ['Clientes', overview.customers], ['Orçamentos', overview.quotes], ['Aprovados', money(overview.approvedSum)]].map(([label, value]) => <Panel key={label}><p className="text-sm text-gray-500">{label}</p><p className="mt-2 font-display text-2xl font-bold text-gray-900">{value}</p></Panel>)}</div>
      <Panel className="mt-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-semibold text-gray-900">Contas e clientes</h2><p className="mt-1 text-sm text-gray-500">Pesquise por negócio, proprietário ou cliente.</p></div><input className={`${fieldClass} mt-0 max-w-sm`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar na plataforma" /></div></Panel>
      <Panel className="mt-5 !p-0"><div className="border-b border-gray-100 p-5"><h2 className="font-semibold text-gray-900">Negócios ({filteredBusinesses.length})</h2></div><div className="divide-y divide-gray-100">{filteredBusinesses.map((row) => <div key={row.businessId} className="flex flex-wrap justify-between gap-3 px-5 py-4"><div><p className="font-medium text-gray-900">{row.businessName}</p><p className="mt-1 text-sm text-gray-500">{row.ownerName} · {row.ownerEmail}</p></div><p className="text-sm text-gray-600">{row.customerCount} clientes · {row.quoteCount} orçamentos</p></div>)}</div></Panel>
      <Panel className="mt-5 !p-0"><div className="border-b border-gray-100 p-5"><h2 className="font-semibold text-gray-900">Clientes ({filteredCustomers.length})</h2></div><div className="divide-y divide-gray-100">{filteredCustomers.slice(0, 100).map((row) => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="font-medium text-gray-900">{row.name} <span className="font-normal text-gray-500">· {row.businessName}</span></p><p className="mt-1 text-sm text-gray-500">{row.email} · conta: {row.ownerEmail}</p></div><button className={secondaryButtonClass} onClick={() => setEditing(row)}>Editar cliente</button></div>)}</div>{filteredCustomers.length > 100 && <p className="p-4 text-center text-xs text-gray-500">Mostrando os primeiros 100 resultados.</p>}</Panel>
    </>}
    {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><Panel className="w-full max-w-xl"><div className="flex items-center justify-between"><h2 className="font-semibold text-gray-900">Editar cliente de {editing.businessName}</h2><button onClick={() => setEditing(null)} aria-label="Fechar">×</button></div><form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={save}>{([['name', 'Nome'], ['phone', 'Telefone'], ['email', 'E-mail'], ['document', 'CPF/CNPJ'], ['serviceAddress', 'Endereço']] as const).map(([key, label]) => <label key={key} className="text-sm font-medium text-gray-700">{label}<input className={fieldClass} value={editing[key]} onChange={(event) => setEditing({ ...editing, [key]: event.target.value })} /></label>)}<label className="text-sm font-medium text-gray-700 sm:col-span-2">Observações<textarea className={fieldClass} rows={3} value={editing.notes} onChange={(event) => setEditing({ ...editing, notes: event.target.value })} /></label><div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className={secondaryButtonClass} onClick={() => setEditing(null)}>Cancelar</button><button className={buttonClass} disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button></div></form></Panel></div>}
  </Page>
}
