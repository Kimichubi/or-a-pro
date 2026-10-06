<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import AppLogo from '../components/AppLogo.vue'

const faqOpen = ref<number | null>(0)

const benefits = [
  {
    title: 'Orçamentos em 2 minutos',
    desc: 'Cadastre cliente, adicione serviços e gere o documento pronto em poucos cliques.',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  {
    title: 'Aparência profissional',
    desc: 'PDF e página com sua logo, cores e condições. Transmita confiança ao cliente.',
    icon: 'M4 4h16v16H4z M4 9h16 M9 4v16',
  },
  {
    title: 'Saiba quem não respondeu',
    desc: 'Veja quem visualizou, aprovou ou recusou — e acompanhe quem está parado.',
    icon: 'M3 12h4l3-8 4 16 3-8h4',
  },
  {
    title: 'Envio pelo WhatsApp',
    desc: 'Mensagem pronta com link do orçamento, direto para o cliente em um clique.',
    icon: 'M21 11.5a8.5 8.5 0 01-12.4 7.6L3 21l1.9-5.6A8.5 8.5 0 1121 11.5z',
  },
  {
    title: 'Aprovação em um clique',
    desc: 'O cliente aprova ou recusa online. Você recebe a resposta e registra a hora.',
    icon: 'M20 6L9 17l-5-5',
  },
  {
    title: 'Acompanhamento inteligente',
    desc: 'Lembretes e follow-up para não deixar nenhum serviço escapar.',
    icon: 'M12 8v4l3 3M12 21a9 9 0 100-18 9 9 0 000 18z',
  },
]

const steps = [
  {
    n: '1',
    title: 'Cadastre e configure',
    desc: 'Crie sua conta, adicione clientes e monte seu catálogo de serviços e materiais.',
  },
  {
    n: '2',
    title: 'Monte o orçamento',
    desc: 'Selecione cliente, itens, desconto e condições. O total é calculado automaticamente.',
  },
  {
    n: '3',
    title: 'Envie e acompanhe',
    desc: 'Gere PDF/link, envie pelo WhatsApp e acompanhe quem visualizou e aprovou.',
  },
]

const testimonials = [
  {
    name: 'Carlos, eletricista',
    quote: 'Antes eu montava orçamento no papel. Agora fecho mais serviços porque o cliente vê tudo bonito e responde rápido.',
  },
  {
    name: 'Marina, técnica de ar-condicionado',
    quote: 'O link com aprovação online mudou tudo. Sei exatamente quem ainda não analisou e cobro na medida.',
  },
  {
    name: 'João, instalador',
    quote: 'Em poucos minutos gero um orçamento com cara de empresa grande. Vale muito para o meu trabalho.',
  },
]

const plans = [
  {
    name: 'Gratuito',
    price: 'R$ 0',
    period: '/mês',
    features: ['Até 5 orçamentos por mês', 'PDF e link público', 'Acompanhamento de status'],
    cta: 'Começar grátis',
    featured: false,
  },
  {
    name: 'Profissional',
    price: 'R$ 29',
    period: '/mês',
    features: ['Orçamentos ilimitados', 'Logo e cores da marca', 'Lembretes e follow-up', 'Catálogo de serviços'],
    cta: 'Assinar Profissional',
    featured: true,
  },
  {
    name: 'Empresa',
    price: 'R$ 79',
    period: '/mês',
    features: ['Múltiplos usuários', 'Personalização avançada', 'Suporte prioritário', 'Relatórios completos'],
    cta: 'Falar com vendas',
    featured: false,
  },
]

const faqs = [
  { q: 'Preciso instalar algo?', a: 'Não. O OrçaPro funciona no navegador do celular ou computador. Você cria a conta e começa a usar em minutos.' },
  { q: 'Meus clientes precisam ter conta?', a: 'Não. O cliente recebe um link e visualiza o orçamento em uma página simples, podendo aprovar ou recusar em um clique.' },
  { q: 'Posso personalizar com minha logo e cores?', a: 'Sim. No plano Profissional e Empresa você adiciona sua logo, cores e termos e condições padrão no PDF e na página do orçamento.' },
  { q: 'O que acontece se eu ficar sem orçamentos no plano grátis?', a: 'No plano Gratuito você gera até 5 orçamentos por mês. Se precisar de mais, é só assinar o plano Profissional.' },
]
</script>

<template>
  <div class="min-h-screen bg-white text-gray-900">
    <!-- Nav -->
    <header class="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <AppLogo size="sm" />
        <nav class="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex">
          <a href="#beneficios" class="hover:text-gray-900">Benefícios</a>
          <a href="#como-funciona" class="hover:text-gray-900">Como funciona</a>
          <a href="#planos" class="hover:text-gray-900">Planos</a>
          <a href="#faq" class="hover:text-gray-900">FAQ</a>
        </nav>
        <div class="flex items-center gap-2">
          <RouterLink to="/login" class="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
            Entrar
          </RouterLink>
          <RouterLink
            to="/register"
            class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Criar conta
          </RouterLink>
        </div>
      </div>
    </header>

    <!-- Hero -->
    <section class="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:py-20">
      <div>
        <p class="mb-4 max-w-md text-sm font-medium text-gray-500">
          Eletricistas, técnicos de ar-condicionado, encanadores, pintores e quem vive de serviço.
        </p>
        <h1 class="font-display text-4xl font-bold leading-[1.08] tracking-tight text-gray-900 md:text-5xl">
          Orçamentos com cara de empresa grande, prontos em minutos.
        </h1>
        <p class="mt-5 max-w-lg text-lg leading-relaxed text-gray-600">
          Monte o documento, envie pelo WhatsApp e veja quem visualizou e aprovou — sem PDF perdido no fim da conversa.
        </p>
        <div class="mt-8 flex flex-wrap items-center gap-3">
          <RouterLink
            to="/register"
            class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Montar meu primeiro orçamento
          </RouterLink>
          <a href="#como-funciona" class="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-6 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50">
            Ver como funciona
          </a>
        </div>
      </div>

      <!-- The one memorable thing: the client's one-tap approval -->
      <div class="hero-scene relative isolate">
        <div class="hero-scene__halo" aria-hidden="true"></div>
        <svg class="hero-scene__route" viewBox="0 0 560 390" fill="none" aria-hidden="true">
          <path class="hero-scene__route-line" d="M14 284C91 284 102 102 190 102S282 284 360 284 442 110 546 110" />
          <circle class="hero-scene__route-node hero-scene__route-node--one" cx="190" cy="102" r="5" />
          <circle class="hero-scene__route-node hero-scene__route-node--two" cx="360" cy="284" r="5" />
          <circle class="hero-scene__route-node hero-scene__route-node--three" cx="546" cy="110" r="5" />
        </svg>
        <div class="hero-quote-card relative z-10 rounded-2xl border border-gray-200 bg-white p-5 shadow-md">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-[10px] font-semibold text-white">EM</span>
              <div>
                <p class="text-sm font-semibold text-gray-900">Edificações Martins</p>
                <p class="text-xs text-gray-500">Orçamento nº 0412 · Instalação de chuveiro</p>
              </div>
            </div>
            <span class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">Aguardando</span>
          </div>

          <div class="mt-4 space-y-2 border-t border-gray-100 pt-4 text-sm">
            <div class="flex justify-between"><span class="text-gray-500">Mão de obra — 2 h</span><span class="font-medium text-gray-800">R$ 120,00</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Chuveiro elétrico 7.5kW</span><span class="font-medium text-gray-800">R$ 280,00</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Desconto combinado</span><span class="font-medium text-orange-600">− R$ 20,00</span></div>
            <div class="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-gray-900"><span>Total</span><span>R$ 380,00</span></div>
          </div>

          <div class="mt-4 grid grid-cols-2 gap-2">
            <span class="rounded-xl bg-green-600 px-3 py-2 text-center text-sm font-semibold text-white">Aprovar</span>
            <span class="rounded-xl border border-red-200 px-3 py-2 text-center text-sm font-semibold text-red-600">Recusar</span>
          </div>

          <p class="mt-4 flex items-center gap-2 text-xs text-gray-500">
            <svg class="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 01-12.4 7.6L3 21l1.9-5.6A8.5 8.5 0 1121 11.5z" /></svg>
            Enviado há 2 dias pelo WhatsApp. Ainda sem resposta.
          </p>
        </div>
      </div>
    </section>

    <!-- Benefits -->
    <section id="beneficios" class="bg-gray-50 py-16">
      <div class="mx-auto max-w-6xl px-4">
        <h2 class="font-display text-center text-3xl font-bold">Por que usar o OrçaPro?</h2>
        <p class="mx-auto mt-2 max-w-2xl text-center text-gray-600">
          Tudo o que um prestador de serviços precisa para parecer profissional e não perder negócios.
        </p>
        <div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="b in benefits" :key="b.title" class="rounded-2xl border border-gray-200 bg-white p-6">
            <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path :d="b.icon" />
              </svg>
            </div>
            <h3 class="font-semibold">{{ b.title }}</h3>
            <p class="mt-1 text-sm text-gray-600">{{ b.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section id="como-funciona" class="py-16">
      <div class="mx-auto max-w-6xl px-4">
        <h2 class="font-display text-center text-3xl font-bold">Como funciona em 3 passos</h2>
        <div class="mt-10 grid gap-6 md:grid-cols-3">
          <div v-for="s in steps" :key="s.n" class="rounded-2xl border border-gray-200 bg-white p-6 text-center">
            <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-lg font-bold text-white">
              {{ s.n }}
            </div>
            <h3 class="font-semibold">{{ s.title }}</h3>
            <p class="mt-1 text-sm text-gray-600">{{ s.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonials (examples) -->
    <section class="bg-gray-50 py-16">
      <div class="mx-auto max-w-6xl px-4">
        <h2 class="font-display text-center text-3xl font-bold">Quem usa adora</h2>
        <p class="mt-1 text-center text-xs text-gray-400">* Depoimentos fictícios para ilustração.</p>
        <div class="mt-10 grid gap-6 md:grid-cols-3">
          <div v-for="t in testimonials" :key="t.name" class="rounded-2xl border border-gray-200 bg-white p-6">
            <div class="mb-2 text-orange-500">★★★★★</div>
            <p class="text-sm text-gray-700">“{{ t.quote }}”</p>
            <p class="mt-3 text-sm font-semibold">{{ t.name }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Plans -->
    <section id="planos" class="py-16">
      <div class="mx-auto max-w-6xl px-4">
        <h2 class="font-display text-center text-3xl font-bold">Planos simples</h2>
        <p class="mt-2 text-center text-gray-600">Comece grátis e evolua conforme seu negócio cresce.</p>
        <div class="mt-10 grid gap-6 md:grid-cols-3">
          <div
            v-for="p in plans"
            :key="p.name"
            class="rounded-2xl border p-6"
            :class="p.featured ? 'border-blue-600 bg-blue-50 shadow-md' : 'border-gray-200 bg-white'"
          >
            <h3 class="font-semibold">{{ p.name }}</h3>
            <div class="mt-2 text-3xl font-bold">{{ p.price }}<span class="text-sm font-normal text-gray-500">{{ p.period }}</span></div>
            <ul class="mt-4 space-y-2 text-sm text-gray-600">
              <li v-for="f in p.features" :key="f" class="flex items-center gap-2">
                <span class="text-green-600">✓</span>{{ f }}
              </li>
            </ul>
            <RouterLink
              to="/register"
              class="mt-6 block rounded-lg px-4 py-2 text-center text-sm font-medium"
              :class="p.featured ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'"
            >
              {{ p.cta }}
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section id="faq" class="bg-gray-50 py-16">
      <div class="mx-auto max-w-3xl px-4">
        <h2 class="font-display text-center text-3xl font-bold">Perguntas frequentes</h2>
        <div class="mt-8 space-y-3">
          <div v-for="(f, i) in faqs" :key="f.q" class="rounded-xl border border-gray-200 bg-white">
            <button class="flex w-full items-center justify-between px-4 py-3 text-left" @click="faqOpen = faqOpen === i ? null : i">
              <span class="font-medium">{{ f.q }}</span>
              <span class="text-gray-400">{{ faqOpen === i ? '−' : '+' }}</span>
            </button>
            <div v-if="faqOpen === i" class="px-4 pb-4 text-sm text-gray-600">{{ f.a }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-16">
      <div class="mx-auto max-w-4xl rounded-3xl bg-blue-600 px-6 py-12 text-center text-white">
        <h2 class="font-display text-3xl font-bold">Pronto para fechar mais serviços?</h2>
        <p class="mt-2 text-blue-100">Crie seu primeiro orçamento profissional em minutos.</p>
        <RouterLink
          to="/register"
          class="mt-6 inline-block rounded-lg bg-white px-6 py-3 font-medium text-blue-700 hover:bg-gray-100"
        >
          Criar meu primeiro orçamento
        </RouterLink>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t border-gray-100 py-8">
      <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-gray-500 md:flex-row">
        <AppLogo size="sm" />
        <p>© {{ new Date().getFullYear() }} OrçaPro — Orçamentos profissionais em 2 minutos.</p>
        <div class="flex gap-4">
          <a href="#planos" class="hover:text-gray-900">Planos</a>
          <a href="#faq" class="hover:text-gray-900">FAQ</a>
        </div>
      </div>
    </footer>
  </div>
</template>
