import Link from 'next/link'
import { ArrowRight, Check, FileText, MessageCircle, ShieldCheck } from 'lucide-react'
import { Brand } from '@/components/Brand'

const steps = [
  {
    title: 'Monte a proposta',
    description: 'Inclua serviços, materiais, prazo e condições em um orçamento com a sua identidade.',
    icon: FileText,
  },
  {
    title: 'Envie para o cliente',
    description: 'Compartilhe um link claro pelo WhatsApp. O cliente abre no celular, sem instalar nada.',
    icon: MessageCircle,
  },
  {
    title: 'Acompanhe a resposta',
    description: 'Saiba quando o orçamento foi visualizado e registre a aprovação no mesmo lugar.',
    icon: ShieldCheck,
  },
]

const features = [
  'Sua marca, seus dados e suas condições em cada proposta',
  'Clientes e serviços organizados para reaproveitar',
  'Histórico de orçamentos e respostas em um só lugar',
]

export default function LandingPage() {
  return (
    <main className="landing-shell">
      <header className="landing-header">
        <div className="landing-header__inner">
          <Brand href="/" />
          <nav className="landing-nav" aria-label="Navegação principal">
            <a href="#como-funciona">Como funciona</a>
            <a href="#recursos">Recursos</a>
          </nav>
          <div className="landing-header__actions">
            <Link href="/login" className="landing-login">Entrar</Link>
            <Link href="/register" className="landing-button landing-button--small">Criar conta</Link>
          </div>
        </div>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero__copy">
          <p className="landing-kicker"><span aria-hidden="true" /> OrçaPro para quem vive do próprio trabalho</p>
          <h1 id="landing-title">Seu trabalho merece um orçamento à altura.</h1>
          <p className="landing-hero__description">
            Crie propostas profissionais, envie pelo WhatsApp e acompanhe a resposta do cliente sem perder tempo com planilhas.
          </p>
          <div className="landing-hero__actions">
            <Link href="/register" className="landing-button">
              Começar agora <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <a href="#como-funciona" className="landing-secondary-link">Conhecer a plataforma</a>
          </div>
          <ul className="landing-benefits" aria-label="O que você organiza no OrçaPro">
            <li><Check size={16} aria-hidden="true" /> Orçamentos com a sua marca</li>
            <li><Check size={16} aria-hidden="true" /> Respostas registradas</li>
            <li><Check size={16} aria-hidden="true" /> Clientes sempre à mão</li>
          </ul>
        </div>

        <div className="landing-video-column">
          <div className="landing-video-heading">
            <span className="landing-video-heading__icon"><FileText size={17} aria-hidden="true" /></span>
            <div>
              <p>Veja o OrçaPro em ação</p>
              <span>Uma apresentação rápida, do orçamento à resposta.</span>
            </div>
          </div>
          <div className="landing-video-frame">
            <video
              controls
              playsInline
              preload="metadata"
              poster="/videos/orcapro-poster.webp"
              aria-label="Vídeo promocional do OrçaPro"
            >
              <source src="/videos/orcapro-promocional.mp4" type="video/mp4" />
              Seu navegador não consegue reproduzir este vídeo.
            </video>
          </div>
          <p className="landing-video-caption">Assista quando quiser. O vídeo não inicia sozinho.</p>
        </div>
      </section>

      <section className="landing-process" id="como-funciona" aria-labelledby="process-title">
        <div className="landing-section-heading">
          <p className="landing-kicker">Um fluxo simples</p>
          <h2 id="process-title">Do primeiro item à decisão do cliente.</h2>
          <p>O OrçaPro deixa cada etapa mais clara para você e para quem vai contratar o serviço.</p>
        </div>
        <ol className="landing-steps">
          {steps.map(({ title, description, icon: Icon }, index) => (
            <li className="landing-step" key={title}>
              <div className="landing-step__top">
                <span className="landing-step__number">0{index + 1}</span>
                <Icon size={20} aria-hidden="true" />
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-tools" id="recursos" aria-labelledby="tools-title">
        <div className="landing-tools__intro">
          <p className="landing-kicker">Feito para a rotina de serviço</p>
          <h2 id="tools-title">Menos retrabalho para você. Mais clareza para o cliente.</h2>
        </div>
        <ul className="landing-tools__list">
          {features.map((feature) => (
            <li key={feature}>
              <span><Check size={16} aria-hidden="true" /></span>
              {feature}
            </li>
          ))}
        </ul>
      </section>

      <section className="landing-close" aria-labelledby="close-title">
        <div>
          <p className="landing-kicker">Pronto para organizar seus próximos serviços?</p>
          <h2 id="close-title">Comece com o próximo orçamento.</h2>
        </div>
        <Link href="/register" className="landing-button landing-button--light">
          Criar minha conta <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>

      <footer className="landing-footer">
        <Brand href="/" size="small" />
        <span>Orçamentos claros para quem faz acontecer.</span>
        <Link href="/login">Entrar na plataforma</Link>
      </footer>
    </main>
  )
}
