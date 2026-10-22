import Link from 'next/link'
import { ArrowRight, Check, FileText, ShieldCheck, Sparkles } from 'lucide-react'

const highlights = [
  'Monte orçamentos com serviços, materiais e descontos',
  'Envie um link profissional pelo WhatsApp',
  'Saiba quando o cliente aprovar ou recusar',
]

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden px-5 py-6 sm:px-10">
      <nav className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="font-display text-xl font-bold tracking-tight text-blue-800">
          OrçaPro
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white">
            Entrar
          </Link>
          <Link href="/register" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800">
            Criar conta
          </Link>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl items-center gap-14 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-24">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-blue-800">
            <Sparkles size={14} aria-hidden="true" />
            Feito para quem trabalha por conta
          </div>
          <h1 className="max-w-2xl font-display text-4xl font-bold leading-tight tracking-tight text-gray-900 sm:text-6xl">
            Seu próximo orçamento pode fechar o próximo serviço.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-gray-600">
            Crie propostas claras, envie pelo WhatsApp e acompanhe cada resposta em um só lugar.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-blue-800">
              Começar grátis <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/login" className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-700 hover:border-blue-400">
              Já tenho uma conta
            </Link>
          </div>
          <ul className="mt-8 space-y-3">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-gray-600">
                <span className="flex size-5 items-center justify-center rounded-full bg-green-100 text-green-700"><Check size={13} aria-hidden="true" /></span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-lg">
          <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-blue-100 via-orange-50 to-transparent blur-2xl" />
          <div className="hero-quote-card relative rounded-3xl border bg-white p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><FileText size={21} aria-hidden="true" /></div>
                <div><p className="font-semibold text-gray-900">Orçamento #1048</p><p className="text-sm text-gray-500">Reparo elétrico residencial</p></div>
              </div>
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">Aguardando</span>
            </div>
            <div className="space-y-4 py-6 text-sm">
              <div className="flex justify-between text-gray-600"><span>Instalação e revisão</span><span>R$ 420,00</span></div>
              <div className="flex justify-between text-gray-600"><span>Materiais elétricos</span><span>R$ 180,00</span></div>
              <div className="flex justify-between border-t border-gray-100 pt-4 font-display text-lg font-bold text-gray-900"><span>Total</span><span>R$ 600,00</span></div>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <div className="flex items-center justify-between text-xs text-gray-500"><span>Cliente</span><span>Válido por 7 dias</span></div>
              <p className="mt-1 font-semibold text-gray-800">Mariana Oliveira</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-green-700 px-3 py-2 text-center text-sm font-semibold text-white">Aprovar</div>
                <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-center text-sm font-semibold text-gray-700">Recusar</div>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2 text-xs text-gray-500"><ShieldCheck size={15} className="text-blue-700" aria-hidden="true" /> Link seguro para o seu cliente responder.</div>
          </div>
          <div className="absolute -right-3 -top-4 hidden rounded-2xl border border-green-100 bg-white px-4 py-3 shadow-md sm:block"><p className="text-xs text-gray-500">Resposta recebida</p><p className="mt-0.5 text-sm font-bold text-green-700">Orçamento aprovado ✓</p></div>
        </div>
      </section>
    </main>
  )
}
