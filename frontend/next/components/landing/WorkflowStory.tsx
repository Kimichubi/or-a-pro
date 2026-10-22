'use client'

import { useState } from 'react'
import { Check, FileText, MessageCircle, Send, Wrench } from 'lucide-react'

const stages = [
  {
    label: 'Monte',
    title: 'Tudo do serviço em uma proposta.',
    description: 'Adicione mão de obra, materiais, prazo e condições. O total fica organizado para você revisar antes de enviar.',
    icon: Wrench,
    preview: 'quote',
  },
  {
    label: 'Envie',
    title: 'Compartilhe um link pelo WhatsApp.',
    description: 'Seu cliente recebe uma página fácil de abrir no celular, com os itens, valores e os dados do seu negócio.',
    icon: Send,
    preview: 'message',
  },
  {
    label: 'Acompanhe',
    title: 'Veja quando o cliente responder.',
    description: 'A visualização e a decisão ficam registradas junto do orçamento, sem procurar conversas antigas.',
    icon: Check,
    preview: 'approved',
  },
] as const

export function WorkflowStory() {
  const [active, setActive] = useState(0)
  const stage = stages[active]
  const Icon = stage.icon

  return (
    <section className="workflow-story" id="como-funciona" aria-labelledby="workflow-title">
      <div className="workflow-story__intro">
        <p className="landing-label">Do serviço à resposta</p>
        <h2 id="workflow-title">Um caminho claro para fechar o próximo trabalho.</h2>
        <p>Veja como cada etapa se conecta em uma única ferramenta.</p>
      </div>
      <div className="workflow-story__body">
        <div className="workflow-story__steps" role="group" aria-label="Etapas do orçamento">
          {stages.map(({ label, title, icon: StepIcon }, index) => (
            <button className="workflow-step" type="button" key={label} aria-pressed={active === index} onClick={() => setActive(index)}>
              <span className="workflow-step__icon"><StepIcon size={18} aria-hidden="true" /></span>
              <span className="workflow-step__copy"><strong>{label}</strong><small>{title}</small></span>
              <span className="workflow-step__index">0{index + 1}</span>
            </button>
          ))}
        </div>
        <div className="workflow-preview" aria-live="polite">
          <div className="workflow-preview__top"><span><i /> Prévia do fluxo</span><span>Orçamento 1048</span></div>
          <div key={stage.preview} className={`workflow-preview__content workflow-preview__content--${stage.preview}`}>
            <span className="workflow-preview__icon"><Icon size={20} aria-hidden="true" /></span>
            <p className="landing-label">Etapa 0{active + 1}</p>
            <h3>{stage.title}</h3>
            <p className="workflow-preview__description">{stage.description}</p>
            {stage.preview === 'quote' && (
              <div className="workflow-mini-quote"><span><FileText size={15} aria-hidden="true" /> Instalação elétrica</span><strong>R$ 600,00</strong></div>
            )}
            {stage.preview === 'message' && (
              <div className="workflow-chat"><span>Oi, Mariana! Preparei o orçamento do serviço.</span><strong><MessageCircle size={14} aria-hidden="true" /> Proposta pronta para abrir</strong></div>
            )}
            {stage.preview === 'approved' && (
              <div className="workflow-approved"><Check size={15} aria-hidden="true" /><span>Cliente aprovou a proposta</span><small>Resposta registrada no histórico</small></div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
