<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getDashboard } from '../api/dashboard'
import type { DashboardStats } from '../api/types'
import StatusBadge from '../components/ui/StatusBadge.vue'
import { formatMoney, formatDate } from '../utils/format'

const stats = ref<DashboardStats | null>(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    stats.value = await getDashboard()
  } catch {
    error.value = 'Não foi possível carregar seus números. Tente novamente.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-7">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-medium text-blue-700">{{ new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) }}</p>
        <h1 class="mt-1 font-display text-3xl font-semibold tracking-tight text-gray-900">Visão geral</h1>
        <p class="mt-2 max-w-xl text-sm leading-6 text-gray-600">Acompanhe seus serviços em aberto e veja o que já virou trabalho.</p>
      </div>
      <RouterLink to="/app/orcamentos/novo" class="inline-flex min-h-11 items-center gap-2 rounded-lg bg-orange-400 px-5 text-sm font-semibold text-blue-900 shadow-sm transition-colors hover:bg-orange-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
        <span aria-hidden="true" class="text-xl leading-none">+</span>
        Criar orçamento
      </RouterLink>
    </div>

    <div v-if="loading" class="grid gap-4 md:grid-cols-2">
      <div class="h-44 animate-pulse rounded-xl bg-gray-200" />
      <div class="h-44 animate-pulse rounded-xl bg-gray-200" />
    </div>
    <div v-else-if="error" role="alert" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{{ error }}</div>

    <template v-else-if="stats">
      <section class="grid overflow-hidden rounded-2xl bg-blue-900 text-white md:grid-cols-[1.4fr_1fr]" aria-label="Desempenho dos orçamentos">
        <div class="relative flex min-h-56 flex-col justify-between overflow-hidden p-6 sm:p-8">
          <div class="absolute -right-8 -top-16 h-64 w-64 rounded-full border border-white/10" aria-hidden="true" />
          <div class="absolute -right-2 -top-10 h-48 w-48 rounded-full border border-white/10" aria-hidden="true" />
          <div class="relative">
            <p class="text-sm text-white/65">Valor aprovado</p>
            <p class="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{{ formatMoney(stats.totalApproved) }}</p>
          </div>
          <p class="relative mt-8 text-sm text-white/70">{{ stats.quotesApproved }} {{ stats.quotesApproved === 1 ? 'serviço confirmado' : 'serviços confirmados' }}</p>
        </div>
        <div class="grid grid-cols-2 border-t border-white/10 bg-white/[0.04] md:border-l md:border-t-0">
          <div class="flex flex-col justify-between border-b border-r border-white/10 p-5 sm:p-6">
            <span class="text-sm text-white/65">Aguardando retorno</span>
            <span class="font-display text-3xl font-semibold text-orange-300">{{ stats.awaitingResponse }}</span>
          </div>
          <div class="flex flex-col justify-between border-b border-white/10 p-5 sm:p-6">
            <span class="text-sm text-white/65">Taxa de aprovação</span>
            <span class="font-display text-3xl font-semibold">{{ stats.approvalRate.toFixed(0) }}%</span>
          </div>
          <div class="flex flex-col justify-between border-r border-white/10 p-5 sm:p-6">
            <span class="text-sm text-white/65">Enviados</span>
            <span class="font-display text-3xl font-semibold">{{ stats.quotesSent }}</span>
          </div>
          <div class="flex flex-col justify-between p-5 sm:p-6">
            <span class="text-sm text-white/65">Aprovados</span>
            <span class="font-display text-3xl font-semibold">{{ stats.quotesApproved }}</span>
          </div>
        </div>
      </section>

      <section class="overflow-hidden rounded-xl border border-gray-200 bg-white" aria-labelledby="recent-quotes-title">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 sm:px-6">
          <div>
            <h2 id="recent-quotes-title" class="font-display text-lg font-semibold text-gray-900">Orçamentos recentes</h2>
            <p class="mt-1 text-sm text-gray-500">Acompanhe as últimas propostas enviadas aos clientes.</p>
          </div>
          <RouterLink to="/app/orcamentos" class="rounded-md px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-700">Ver todos</RouterLink>
        </div>
        <div v-if="stats.recentQuotes.length === 0" class="grid gap-8 px-6 py-10 sm:px-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h3 class="font-display text-xl font-semibold text-gray-900">Vamos preparar seu primeiro orçamento?</h3>
            <p class="mt-2 max-w-lg text-sm leading-6 text-gray-600">Comece por um cliente. Depois você monta a proposta e acompanha a resposta por aqui.</p>
            <div class="mt-5 flex flex-wrap items-center gap-3">
              <RouterLink to="/app/clientes" class="inline-flex min-h-10 items-center rounded-lg bg-blue-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400">Cadastrar cliente</RouterLink>
              <RouterLink to="/app/orcamentos/novo" class="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-blue-700">Já tenho cliente? Criar orçamento</RouterLink>
            </div>
          </div>
          <svg class="hidden h-36 w-52 sm:block" viewBox="0 0 220 150" fill="none" aria-hidden="true">
            <path class="hero-scene__route-line" d="M10 112h38c22 0 18-72 48-72h34c22 0 18 56 42 56h38" />
            <circle class="hero-scene__route-node" cx="48" cy="112" r="5" />
            <circle class="hero-scene__route-node hero-scene__route-node--two" cx="96" cy="40" r="5" />
            <circle class="hero-scene__route-node hero-scene__route-node--three" cx="172" cy="96" r="5" />
            <rect x="76" y="53" width="70" height="78" rx="9" fill="#fff" stroke="#e3ded3" stroke-width="2" />
            <path d="M91 75h39M91 87h29M91 105h18" stroke="#1f6f70" stroke-width="3" stroke-linecap="round" />
            <path d="m117 108 5 5 10-12" stroke="#dd8f28" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <ul v-else class="divide-y divide-gray-100">
          <li v-for="q in stats.recentQuotes" :key="q.id">
            <RouterLink :to="`/app/orcamentos/${q.id}`" class="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-blue-700 sm:px-6">
              <div class="min-w-0">
                <p class="truncate font-medium text-gray-900">{{ q.customer }}</p>
                <p class="mt-1 truncate text-sm text-gray-500">{{ q.title }} <span aria-hidden="true">·</span> {{ formatDate(q.createdAt) }}</p>
              </div>
              <div class="flex shrink-0 items-center gap-3">
                <span class="font-semibold tabular-nums text-gray-900">{{ formatMoney(q.total) }}</span>
                <StatusBadge :status="q.status" />
              </div>
            </RouterLink>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
