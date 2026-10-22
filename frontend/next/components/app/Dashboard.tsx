'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { api, money, date } from '@/lib/client-api'
import { Loading, Notice, Page, Panel } from './Page'

type DashboardData = { quotesSent: number; quotesApproved: number; totalApproved: number; awaitingResponse: number; approvalRate: number; recentQuotes: { id: string; status: string; customer: string; title: string; total: number; createdAt: string }[] }
const statusNames: Record<string, string> = { draft: 'Rascunho', sent: 'Enviado', viewed: 'Visualizado', approved: 'Aprovado', declined: 'Recusado', expired: 'Expirado' }

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { api<DashboardData>('/api/dashboard').then(setData).catch((err) => setError(err.message)) }, [])
  return <Page title="Painel" description="Acompanhe o movimento dos seus orçamentos." action={{ label: 'Novo orçamento', href: '/app/orcamentos/novo' }}>
    {error && <Notice>{error}</Notice>}
    {!data && !error ? <Loading /> : data && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[['Orçamentos enviados', data.quotesSent], ['Aprovados', data.quotesApproved], ['Em negociação', data.awaitingResponse], ['Valor aprovado', money(data.totalApproved)]].map(([label, value]) => <Panel key={label}><p className="text-sm text-gray-500">{label}</p><p className="mt-2 font-display text-2xl font-bold text-gray-900">{value}</p>{label === 'Orçamentos enviados' && <p className="mt-1 text-xs text-gray-500">Taxa de aprovação: {data.approvalRate}%</p>}</Panel>)}
      </div>
      <Panel className="mt-6 !p-0">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><div><h2 className="font-semibold text-gray-900">Atividade recente</h2><p className="mt-0.5 text-xs text-gray-500">Últimos orçamentos atualizados</p></div><Link href="/app/orcamentos" className="text-sm font-semibold text-blue-700 hover:underline">Ver todos</Link></div>
        {data.recentQuotes.length ? <div className="divide-y divide-gray-100">{data.recentQuotes.map((quote) => <Link key={quote.id} href={`/app/orcamentos/${quote.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50"><div><p className="font-medium text-gray-900">{quote.title}</p><p className="mt-1 text-sm text-gray-500">{quote.customer} · {date(quote.createdAt)}</p></div><div className="text-right"><p className="font-semibold text-gray-900">{money(quote.total)}</p><span className="text-xs text-gray-500">{statusNames[quote.status] ?? quote.status}</span></div></Link>)}</div> : <div className="p-8 text-center text-sm text-gray-500">Seus orçamentos aparecerão aqui.</div>}
      </Panel>
    </>}
  </Page>
}
