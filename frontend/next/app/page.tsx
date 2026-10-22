import Link from 'next/link'
import { ArrowDown, ArrowRight, Check, FileText, Layers3, Users } from 'lucide-react'
import { Brand } from '@/components/Brand'
import { QuoteApprovalDemo } from '@/components/landing/QuoteApprovalDemo'
import { WorkflowStory } from '@/components/landing/WorkflowStory'

const capabilities = [
  {
    title: 'A sua marca em cada proposta',
    description: 'Dados do negócio, logotipo e condições reunidos em um documento profissional.',
    icon: FileText,
  },
  {
    title: 'Clientes organizados',
    description: 'Guarde os dados de contato e encontre tudo quando chegar um novo serviço.',
    icon: Users,
  },
  {
    title: 'Serviços prontos para reutilizar',
    description: 'Mantenha um catálogo de itens para montar os próximos orçamentos com agilidade.',
    icon: Layers3,
  },
]

export default function LandingPage() {
  return (
    <main className="site-home">
      <header className="site-header">
        <div className="site-header__inner">
          <Brand href="/" />
          <nav className="site-nav" aria-label="Navegação principal">
            <a href="#como-funciona">Como funciona</a>
            <a href="#recursos">Recursos</a>
            <a href="#video">Vídeo</a>
          </nav>
          <div className="site-header__actions">
            <Link href="/login" className="site-login">Entrar</Link>
            <Link href="/register" className="site-button site-button--small">Criar conta</Link>
          </div>
        </div>
      </header>

      <section className="site-hero" aria-labelledby="site-title">
        <div className="site-hero__copy">
          <p className="landing-label"><span className="landing-label__dot" /> Orçamentos profissionais, sem planilhas</p>
          <h1 id="site-title">Apresente seu trabalho com clareza.</h1>
          <p className="site-hero__description">Crie uma proposta com a sua marca, envie pelo WhatsApp e acompanhe a resposta do cliente em um só lugar.</p>
          <div className="site-hero__actions">
            <Link href="/register" className="site-button">Criar meu primeiro orçamento <ArrowRight size={17} aria-hidden="true" /></Link>
            <a href="#como-funciona" className="site-text-link">Conhecer o fluxo <ArrowDown size={15} aria-hidden="true" /></a>
          </div>
          <div className="site-hero__note"><Check size={15} aria-hidden="true" /><span>Comece com o plano grátis e organize sua próxima proposta.</span></div>
        </div>
        <QuoteApprovalDemo />
        <div className="site-hero__edge" aria-hidden="true"><span>01</span><i /></div>
      </section>

      <WorkflowStory />

      <section className="site-video" id="video" aria-labelledby="video-title">
        <div className="site-video__copy">
          <p className="landing-label">Conheça a plataforma</p>
          <h2 id="video-title">Veja o OrçaPro em ação.</h2>
          <p>Uma apresentação rápida de como organizar serviços, enviar uma proposta e acompanhar a decisão do cliente.</p>
          <a className="site-text-link" href="#recursos">Ver o que está incluído <ArrowRight size={15} aria-hidden="true" /></a>
        </div>
        <div className="site-video__frame">
          <video controls playsInline preload="metadata" poster="/videos/orcapro-poster.webp" aria-label="Vídeo promocional do OrçaPro">
            <source src="/videos/orcapro-promocional.mp4" type="video/mp4" />
            Seu navegador não consegue reproduzir este vídeo.
          </video>
          <span className="site-video__play-label"><span /> Vídeo de apresentação</span>
        </div>
      </section>

      <section className="site-capabilities" id="recursos" aria-labelledby="capabilities-title">
        <div className="site-capabilities__heading">
          <p className="landing-label">Feito para quem presta serviços</p>
          <h2 id="capabilities-title">Menos tempo montando proposta. Mais tempo no serviço.</h2>
        </div>
        <div className="site-capabilities__list">
          {capabilities.map(({ title, description, icon: Icon }, index) => (
            <article className="site-capability" key={title}>
              <span className="site-capability__icon"><Icon size={19} aria-hidden="true" /></span>
              <div><h3>{title}</h3><p>{description}</p></div>
              <span className="site-capability__number">0{index + 1}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="site-close" aria-labelledby="close-title">
        <div className="site-close__mark" aria-hidden="true"><FileText size={24} /></div>
        <p className="landing-label">O próximo orçamento pode começar agora</p>
        <h2 id="close-title">Deixe a sua proposta falar pelo seu trabalho.</h2>
        <Link href="/register" className="site-button site-button--light">Começar grátis <ArrowRight size={17} aria-hidden="true" /></Link>
      </section>

      <footer className="site-footer">
        <Brand href="/" size="small" />
        <span>Orçamentos claros para quem faz acontecer.</span>
        <Link href="/login">Entrar na plataforma</Link>
      </footer>
    </main>
  )
}
