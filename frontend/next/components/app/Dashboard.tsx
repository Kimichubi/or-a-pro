'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BadgeCheck, CircleDollarSign, Clock3, FileText, ArrowRight } from 'lucide-react'
import { api, money, date } from '@/lib/client-api'
import { Loading, Notice, Page, Panel } from './Page'

type DashboardData = {
  quotesSent: number
  quotesApproved: number
  totalApproved: number
  awaitingResponse: number
  approvalRate: number
  recentQuotes: { id: string; status: string; customer: string; title: string; total: number; createdAt: string }[]
}

const statusNames: Record<string, string> = {
  draft: 'Rascunho',
  sent: 'Enviado',
  viewed: 'Visualizado',
  approved: 'Aprovado',
  declined: 'Recusado',
  expired: 'Expirado',
}

const statusClasses: Record<string, string> = {
  draft: 'status-pill status-pill--neutral',
  sent: 'status-pill status-pill--blue',
  viewed: 'status-pill status-pill--amber',
  approved: 'status-pill status-pill--green',
  declined: 'status-pill status-pill--red',
  expired: 'status-pill status-pill--neutral',
}

function Metric({ label, value, detail, icon: Icon, tone }: {
  label: string
  value: string | number
  detail?: string
  icon: typeof FileText
  tone: 'petrol' | 'green' | 'amber' | 'ink'
}) {
  return (
    <Panel className="metric-card">
      <div className="metric-card__top">
        <span className="metric-card__label">{label}</span>
        <span className={['metric-card__icon', 'metric-card__icon--' + tone].join(' ')}>
          <Icon size={19} aria-hidden="true" />
        </span>
      </div>
      <p className="metric-card__value">{value}</p>
      {detail && <p className="metric-card__detail">{detail}</p>}
    </Panel>
  )
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api<DashboardData>('/api/dashboard')
      .then(setData)
      .catch((err) => setError(err.message))
  }, [])

  return (
    <Page
      title="Painel"
      description="Acompanhe o movimento dos seus orçamentos."
      action={{ label: 'Novo orçamento', href: '/app/orcamentos/novo' }}
    >
      {error && <Notice>{error}</Notice>}
      {!data && !error ? <Loading /> : data && (
        <>
          <section className="dashboard-metrics" aria-label="Resumo dos orçamentos">
            <Metric label="Orçamentos enviados" value={data.quotesSent} detail={'Taxa de aprovação: ' + data.approvalRate + '%'} icon={FileText} tone="petrol" />
            <Metric label="Aprovados" value={data.quotesApproved} detail="Serviços confirmados" icon={BadgeCheck} tone="green" />
            <Metric label="Aguardando resposta" value={data.awaitingResponse} detail="Orçamentos em aberto" icon={Clock3} tone="amber" />
            <Metric label="Valor aprovado" value={money(data.totalApproved)} detail="Soma dos orçamentos aprovados" icon={CircleDollarSign} tone="ink" />
          </section>

          <Panel className="dashboard-activity !p-0">
            <div className="dashboard-activity__header">
              <div>
                <h2>Atividade recente</h2>
                <p>Seus últimos orçamentos atualizados</p>
              </div>
              <Link href="/app/orcamentos" className="dashboard-activity__all">
                Ver todos <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            {data.recentQuotes.length ? (
              <div className="activity-list">
                {data.recentQuotes.map((quote) => (
                  <Link key={quote.id} href={'/app/orcamentos/' + quote.id} className="activity-row">
                    <span className="activity-row__icon"><FileText size={18} aria-hidden="true" /></span>
                    <span className="activity-row__main">
                      <strong>{quote.title}</strong>
                      <span>{quote.customer} · {date(quote.createdAt)}</span>
                    </span>
                    <span className="activity-row__summary">
                      <strong>{money(quote.total)}</strong>
                      <span className={statusClasses[quote.status] ?? 'status-pill status-pill--neutral'}>
                        {statusNames[quote.status] ?? quote.status}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty">
                <span className="dashboard-empty__icon"><FileText size={21} aria-hidden="true" /></span>
                <h3>Seu próximo orçamento começa aqui</h3>
                <p>Crie uma proposta e acompanhe a resposta do cliente pelo painel.</p>
                <Link href="/app/orcamentos/novo">Criar orçamento <ArrowRight size={16} aria-hidden="true" /></Link>
              </div>
            )}
          </Panel>
        </>
      )}
    </Page>
  )
}
