<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { createBillingPortal, createCheckout, getBillingStatus } from '../api/billing'
import type { BillingStatus } from '../api/types'
import { errorMessage } from '../api/client'

const route = useRoute()
const status = ref<BillingStatus | null>(null)
const loading = ref(true)
const submitting = ref(false)
const error = ref('')
const notice = ref('')
let refreshTimer: ReturnType<typeof setInterval> | undefined
let refreshAttempts = 0

const planName = computed(() => ({
  free: 'Gratuito',
  professional: 'Profissional',
  company: 'Empresa',
}[status.value?.plan || 'free']))
const subscriptionLabel = computed(() => ({
  active: 'Ativa',
  trialing: 'Em período de teste',
  past_due: 'Pagamento pendente',
  incomplete: 'Aguardando pagamento',
  canceled: 'Cancelada',
  unpaid: 'Pagamento não realizado',
}[status.value?.subscriptionStatus || ''] || 'Sem assinatura'))

async function loadStatus() {
  error.value = ''
  try {
    status.value = await getBillingStatus()
    if (route.query.success === '1' && status.value.plan !== 'free') {
      notice.value = 'Assinatura confirmada. Seu plano já está ativo.'
      if (refreshTimer) clearInterval(refreshTimer)
    }
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
}

async function startCheckout(plan: 'professional') {
  submitting.value = true
  error.value = ''
  try {
    const url = await createCheckout(plan)
    window.location.assign(url)
  } catch (err) {
    error.value = errorMessage(err)
    submitting.value = false
  }
}

async function openPortal() {
  submitting.value = true
  error.value = ''
  try {
    const url = await createBillingPortal()
    window.location.assign(url)
  } catch (err) {
    error.value = errorMessage(err)
    submitting.value = false
  }
}

onMounted(async () => {
  await loadStatus()
  if (route.query.canceled === '1') notice.value = 'Pagamento cancelado. Nenhuma cobrança foi feita.'
  if (route.query.success === '1' && status.value?.plan === 'free') {
    notice.value = 'Pagamento recebido. Estamos confirmando a assinatura com a Stripe…'
    refreshTimer = setInterval(async () => {
      refreshAttempts += 1
      await loadStatus()
      if (status.value?.plan !== 'free' || refreshAttempts >= 15) {
        if (refreshTimer) clearInterval(refreshTimer)
      }
    }, 2000)
  }
  if (route.query.checkout === 'professional' && status.value?.billingEnabled) {
    const subscriptionInProgress = ['active', 'trialing', 'past_due', 'incomplete', 'unpaid', 'paused']
      .includes(status.value.subscriptionStatus)
    if (status.value.plan === 'free' && !subscriptionInProgress) {
      await startCheckout('professional')
    } else {
      notice.value = 'Sua conta já tem uma assinatura em andamento. Use o portal para gerenciar o pagamento.'
    }
  }
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<template>
  <section class="mx-auto max-w-3xl space-y-6">
    <header>
      <p class="text-sm font-semibold uppercase tracking-wide text-blue-700">Conta</p>
      <h1 class="mt-1 text-2xl font-bold text-gray-900">Assinatura e pagamentos</h1>
      <p class="mt-2 text-sm text-gray-600">Veja seu plano, acompanhe o uso e gerencie a cobrança do OrçaPro.</p>
    </header>

    <div v-if="notice" class="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900" role="status">
      {{ notice }}
    </div>
    <div v-if="error" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
      {{ error }}
    </div>

    <div v-if="loading" class="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500" aria-live="polite">
      Carregando assinatura…
    </div>

    <template v-else-if="status">
      <article class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-sm text-gray-500">Plano atual</p>
            <h2 class="mt-1 text-2xl font-bold text-gray-900">{{ planName }}</h2>
            <p class="mt-2 text-sm text-gray-600">Status: <span class="font-semibold text-gray-900">{{ subscriptionLabel }}</span></p>
          </div>
          <span class="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
            {{ status.plan === 'free' ? 'Sem cobrança' : 'Stripe Billing' }}
          </span>
        </div>

        <div v-if="status.quotesLimit !== null" class="mt-6 rounded-xl bg-gray-50 p-4">
          <div class="flex items-center justify-between gap-4 text-sm">
            <span class="font-medium text-gray-700">Orçamentos criados neste mês</span>
            <span class="font-semibold text-gray-900">{{ status.quotesUsed }} de {{ status.quotesLimit }}</span>
          </div>
          <div class="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
            <div class="h-full rounded-full bg-blue-600" :style="{ width: `${Math.min(100, status.quotesUsed / status.quotesLimit * 100)}%` }" />
          </div>
        </div>

        <div class="mt-6 flex flex-wrap gap-3">
          <button
            v-if="status.canManage"
            class="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            :disabled="submitting"
            @click="openPortal"
          >
            Gerenciar pagamento ou cancelar
          </button>
          <button
            v-if="status.plan === 'free' && ['inactive', 'canceled', 'incomplete_expired'].includes(status.subscriptionStatus)"
            class="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            :disabled="submitting || !status.billingEnabled"
            @click="startCheckout('professional')"
          >
            {{ submitting ? 'Abrindo checkout…' : 'Assinar Profissional · R$ 29/mês' }}
          </button>
          <button
            class="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="loading"
            @click="loadStatus"
          >
            Atualizar status
          </button>
        </div>
        <p v-if="!status.billingEnabled" class="mt-3 text-xs text-amber-700">
          O checkout será habilitado após configurar as chaves e o preço da Stripe.
        </p>
      </article>

      <article v-if="status.plan === 'free'" class="rounded-2xl border border-blue-100 bg-blue-50 p-6">
        <h2 class="font-semibold text-blue-950">Profissional · R$ 29/mês</h2>
        <p class="mt-2 text-sm text-blue-900">Orçamentos ilimitados, logo e cores da marca, lembretes e catálogo de serviços.</p>
        <p class="mt-3 text-xs text-blue-800">O pagamento é processado pela página segura da Stripe. Você pode gerenciar ou cancelar pelo portal depois da primeira cobrança.</p>
      </article>
    </template>
  </section>
</template>
