'use client'

import { useState } from 'react'
import { ArrowUpRight, Check, FileText, MessageCircle, Sparkles } from 'lucide-react'
import { Brand } from '@/components/Brand'

export function QuoteApprovalDemo() {
  const [approved, setApproved] = useState(false)

  return (
    <div className={`quote-demo${approved ? ' quote-demo--approved' : ''}`}>
      <div className="quote-demo__glow" aria-hidden="true" />
      <div className="quote-demo__window">
        <div className="quote-demo__bar">
          <span className="quote-demo__dots" aria-hidden="true"><i /><i /><i /></span>
          <span>orcamento.orcapro.app</span>
          <ArrowUpRight size={15} aria-hidden="true" />
        </div>
        <article className="quote-demo__paper" aria-label="Prévia de orçamento demonstrativo">
          <div className="quote-demo__paper-top">
            <Brand size="small" />
            <span className="quote-demo__reference">PROPOSTA · 1048</span>
          </div>
          <p className="quote-demo__overline">Serviço residencial</p>
          <h2>Instalação elétrica</h2>
          <p className="quote-demo__customer">Para Mariana Oliveira</p>
          <div className="quote-demo__items">
            <div><span>Instalação e revisão</span><strong>R$ 420,00</strong></div>
            <div><span>Materiais elétricos</span><strong>R$ 180,00</strong></div>
          </div>
          <div className="quote-demo__total"><span>Total do serviço</span><strong>R$ 600,00</strong></div>
          <div className="quote-demo__validity"><FileText size={15} aria-hidden="true" /><span>Prazo e condições descritos na proposta</span></div>
          <div className="quote-demo__response" aria-live="polite">
            {approved ? <><Check size={16} aria-hidden="true" /><span>Orçamento aprovado</span></> : <><span className="quote-demo__pulse" aria-hidden="true" /><span>Aguardando resposta do cliente</span></>}
          </div>
        </article>
      </div>
      <div className="quote-demo__message" aria-live="polite">
        <span className="quote-demo__message-icon"><MessageCircle size={17} aria-hidden="true" /></span>
        <span><strong>{approved ? 'Mariana aprovou' : 'Enviado pelo WhatsApp'}</strong><small>{approved ? 'A resposta ficou registrada no OrçaPro' : 'O cliente abre a proposta pelo celular'}</small></span>
        {approved && <Sparkles size={16} aria-hidden="true" className="quote-demo__spark" />}
      </div>
      <button className="quote-demo__toggle" type="button" aria-pressed={approved} onClick={() => setApproved((value) => !value)}>
        {approved ? 'Ver orçamento aguardando' : 'Simular aprovação'}
        <ArrowUpRight size={15} aria-hidden="true" />
      </button>
      <p className="quote-demo__caption">Prévia demonstrativa · toque para mudar o estado</p>
    </div>
  )
}
