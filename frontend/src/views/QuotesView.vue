<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { listQuotes, listAwaiting } from '../api/quotes'
import type { AwaitingQuote, QuoteStatus, QuoteSummary } from '../api/types'
import { formatMoney, formatDate } from '../utils/format'
import { openWhatsApp } from '../utils/whatsapp'
import StatusBadge from '../components/ui/StatusBadge.vue'

const quotes = ref<QuoteSummary[]>([])
const awaiting = ref<AwaitingQuote[]>([])
const status = ref('')
const loading = ref(true)
const error = ref('')

const tabs: { value: '' | QuoteStatus; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'draft', label: 'Rascunho' },
  { value: 'sent', label: 'Enviado' },
  { value: 'viewed', label: 'Visualizado' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'declined', label: 'Recusado' },
  { value: 'expired', label: 'Expirado' },
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [q, a] = await Promise.all([listQuotes(status.value), listAwaiting()])
    quotes.value = q
    awaiting.value = a
  } catch {
    error.value = 'Não foi possível carregar os orçamentos. Tente novamente.'
  } finally {
    loading.value = false
  }
}

async function setStatus(s: '' | QuoteStatus) {
  status.value = s
  await load()
}

function followUpMessage(q: AwaitingQuote): string {
  return `Olá, ${q.customer}. Gostaria de saber se conseguiu analisar o orçamento enviado. Posso esclarecer alguma dúvida?`
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-medium text-blue-700">Propostas e serviços</p>
        <h1 class="mt-1 font-display text-3xl font-semibold tracking-tight text-gray-900">Orçamentos</h1>
        <p class="mt-2 text-sm text-gray-600">Veja o que foi enviado e acompanhe cada resposta.</p>
      </div>
      <RouterLink
        to="/app/orcamentos/novo"
        class="inline-flex min-h-11 items-center gap-2 rounded-lg bg-orange-400 px-5 text-sm font-semibold text-blue-900 shadow-sm transition-colors hover:bg-orange-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      >
        <span aria-hidden="true" class="text-xl leading-none">+</span>
        Novo orçamento
      </RouterLink>
    </div>

    <section v-if="awaiting.length" class="overflow-hidden rounded-xl border border-orange-200 bg-orange-50/70" aria-labelledby="awaiting-title">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-orange-200 px-5 py-4">
        <div>
          <h2 id="awaiting-title" class="font-display text-lg font-semibold text-gray-900">Aguardando resposta</h2>
          <p class="mt-1 text-sm text-gray-600">{{ awaiting.length }} {{ awaiting.length === 1 ? 'cliente ainda precisa' : 'clientes ainda precisam' }} de um retorno.</p>
        </div>
        <span class="rounded-full bg-orange-200 px-3 py-1 text-sm font-semibold text-orange-900">{{ awaiting.length }}</span>
      </div>
      <ul class="divide-y divide-orange-200/70">
        <li v-for="q in awaiting" :key="q.id" class="flex flex-wrap items-center justify-between gap-3 bg-white/70 px-5 py-4">
          <div class="min-w-0">
            <RouterLink :to="`/app/orcamentos/${q.id}`" class="truncate font-medium text-gray-900 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-700">{{ q.customer }} <span class="font-normal text-gray-500">/ {{ q.title }}</span></RouterLink>
            <p class="mt-1 text-sm text-gray-500">{{ formatMoney(q.total) }} <span aria-hidden="true">·</span> há {{ q.daysPending }} {{ q.daysPending === 1 ? 'dia' : 'dias' }}</p>
          </div>
          <button
            class="inline-flex min-h-10 items-center rounded-lg border border-green-700 px-4 text-sm font-semibold text-green-800 transition-colors hover:bg-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800"
            :aria-label="`Enviar lembrete para ${q.customer} pelo WhatsApp`"
            @click="openWhatsApp(q.customerPhone, followUpMessage(q))"
          >
            Lembrar pelo WhatsApp
          </button>
        </li>
      </ul>
    </section>

    <div class="flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar orçamentos">
      <button
        v-for="t in tabs"
        :key="t.value"
        class="min-h-10 shrink-0 rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        :class="status === t.value ? 'border-blue-900 bg-blue-900 text-white' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-100'"
        :aria-pressed="status === t.value"
        @click="setStatus(t.value)"
      >
        {{ t.label }}
      </button>
    </div>

    <div v-if="loading" class="space-y-2" aria-label="Carregando orçamentos">
      <div v-for="row in 4" :key="row" class="h-16 animate-pulse rounded-lg bg-gray-200" />
    </div>

    <div v-else-if="error" role="alert" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{{ error }}</div>

    <div v-else-if="quotes.length === 0" class="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center" role="status">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-800">
        <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6 3.75h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.75a1 1 0 0 1 1-1z" />
          <path d="M14 4v4h4M8 13h8m-8 4h5" />
        </svg>
      </div>
      <h2 class="mt-4 font-display text-lg font-semibold text-gray-900">{{ status ? 'Nada com esse filtro' : 'Seu próximo orçamento começa com um cliente' }}</h2>
      <p class="mx-auto mt-1 max-w-lg text-sm leading-6 text-gray-500">{{ status ? 'Mude o status selecionado ou veja todas as propostas.' : 'Cadastre um cliente para preparar a proposta e acompanhar a resposta por aqui.' }}</p>
      <div class="mt-5 flex flex-wrap justify-center gap-3">
        <button v-if="status" class="inline-flex min-h-10 items-center rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700" @click="setStatus('')">Ver todos os orçamentos</button>
        <template v-else>
          <RouterLink to="/app/clientes" class="inline-flex min-h-10 items-center rounded-lg bg-blue-900 px-4 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400">Cadastrar cliente</RouterLink>
          <RouterLink to="/app/orcamentos/novo" class="inline-flex min-h-10 items-center rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Já tenho cliente</RouterLink>
        </template>
      </div>
    </div>

    <section v-else class="overflow-hidden rounded-xl border border-gray-200 bg-white" aria-label="Lista de orçamentos">
      <ul class="divide-y divide-gray-100">
        <li v-for="q in quotes" :key="q.id">
          <RouterLink
            :to="`/app/orcamentos/${q.id}`"
            class="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-blue-700 sm:px-6"
          >
            <div class="min-w-0">
              <p class="truncate font-medium text-gray-900">{{ q.customerName }}</p>
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
  </div>
</template>
