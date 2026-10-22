'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { api, date, fieldClass, money } from '@/lib/client-api'
import { Loading, Notice, Page, Panel } from './Page'

type Quote = { id: string; title: string; customerName: string; status: string; total: number; createdAt: string }
const labels: Record<string, string> = { draft: 'Rascunho', sent: 'Enviado', viewed: 'Visualizado', approved: 'Aprovado', declined: 'Recusado', expired: 'Expirado' }

export function Quotes() {
  const [rows, setRows] = useState<Quote[] | null>(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    api<Quote[]>(`/api/quotes${status ? `?status=${status}` : ''}`)
      .then((data) => { if (active) setRows(data) })
      .catch((err) => { if (active) setError(err.message) })
    return () => { active = false }
  }, [status])
  return <Page title="Orçamentos" description="Crie, envie e acompanhe suas propostas." action={{ label: 'Novo orçamento', href: '/app/orcamentos/novo' }}>
    {error && <Notice>{error}</Notice>}
    <Panel className="!p-0"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5"><div><h2 className="font-semibold text-gray-900">Todos os orçamentos</h2><p className="mt-1 text-xs text-gray-500">{rows?.length ?? 0} registros</p></div><label className="text-sm font-medium text-gray-700">Status<select className={`${fieldClass} mt-0 ml-2 w-44`} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos</option>{Object.entries(labels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>
      {!rows ? <div className="p-5"><Loading /></div> : rows.length ? <div className="divide-y divide-gray-100">{rows.map((row) => <Link key={row.id} href={`/app/orcamentos/${row.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50"><div><p className="font-semibold text-gray-900">{row.title}</p><p className="mt-1 text-sm text-gray-500">{row.customerName} · {date(row.createdAt)}</p></div><div className="text-right"><p className="font-semibold text-gray-900">{money(row.total)}</p><span className="text-xs text-gray-500">{labels[row.status] ?? row.status}</span></div></Link>)}</div> : <div className="p-8 text-center text-sm text-gray-500">Nenhum orçamento encontrado.</div>}
    </Panel>
  </Page>
}
