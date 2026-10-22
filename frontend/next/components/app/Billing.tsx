'use client'

import { useEffect, useState } from 'react'
import { api, buttonClass, secondaryButtonClass } from '@/lib/client-api'
import { Loading, Notice, Page, Panel } from './Page'

type BillingData = { plan: 'free' | 'professional' | 'company'; subscriptionStatus: string; quotesUsed: number; quotesLimit: number | null; canManage: boolean; billingEnabled: boolean }
const statusLabels: Record<string, string> = { active: 'Ativa', trialing: 'Em período de teste', inactive: 'Inativa', past_due: 'Pagamento pendente', canceled: 'Cancelada', unpaid: 'Não paga' }

export function Billing() {
  const [data, setData] = useState<BillingData | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { api<BillingData>('/api/billing/status').then(setData).catch((err) => setError(err.message)) }, [])
  async function action(path: string) {
    setBusy(true); setError('')
    try { const result = await api<{ url: string }>(path, { method: 'POST', ...(path.endsWith('checkout') ? { body: JSON.stringify({ plan: 'professional' }) } : {}) }); window.location.assign(result.url) }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível abrir o pagamento.') } finally { setBusy(false) }
  }
  return <Page title="Assinatura" description="Gerencie seu plano e acompanhe o uso mensal.">
    {error && <Notice>{error}</Notice>}
    {!data ? <Loading /> : <div className="grid gap-5 lg:grid-cols-2"><Panel><p className="text-sm font-semibold text-blue-700">PLANO ATUAL</p><h2 className="mt-2 font-display text-3xl font-bold text-gray-900">{data.plan === 'company' ? 'Empresa' : data.plan === 'professional' ? 'Profissional' : 'Grátis'}</h2><p className="mt-2 text-sm text-gray-600">Status da assinatura: {statusLabels[data.subscriptionStatus] ?? data.subscriptionStatus}</p><div className="mt-6 rounded-xl bg-gray-50 p-4"><p className="text-sm font-medium text-gray-800">Orçamentos criados neste mês</p><p className="mt-1 text-2xl font-bold text-gray-900">{data.quotesUsed}{data.quotesLimit !== null ? <span className="text-base font-medium text-gray-500"> / {data.quotesLimit}</span> : <span className="ml-2 text-sm font-medium text-green-700">Ilimitados</span>}</p></div>{data.canManage && <button className={`${secondaryButtonClass} mt-5`} disabled={busy} onClick={() => action('/api/billing/portal')}>{busy ? 'Abrindo…' : 'Gerenciar cobrança'}</button>}</Panel>
      <Panel><p className="text-sm font-semibold text-orange-700">PLANO PROFISSIONAL</p><h2 className="mt-2 font-display text-2xl font-bold text-gray-900">Mais controle no dia a dia</h2><ul className="mt-4 space-y-2 text-sm text-gray-600"><li>• Orçamentos mensais ilimitados</li><li>• Catálogo de serviços e materiais</li><li>• Logotipo nos orçamentos</li><li>• Histórico de lembretes</li></ul>{data.plan === 'free' && <button className={`${buttonClass} mt-6 w-full`} disabled={busy || !data.billingEnabled} onClick={() => action('/api/billing/checkout')}>{busy ? 'Conectando ao Stripe…' : data.billingEnabled ? 'Assinar com segurança' : 'Pagamento ainda não configurado'}</button>}{!data.billingEnabled && <p className="mt-3 text-xs leading-5 text-gray-500">O pagamento fica disponível após configurar o Stripe no ambiente do servidor.</p>}</Panel>
    </div>}
  </Page>
}
