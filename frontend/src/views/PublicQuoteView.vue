<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getPublicQuote, approveQuote, declineQuote } from '../api/quotes'
import { errorMessage } from '../api/client'
import type { QuoteDetail } from '../api/types'
import { formatMoney, formatDate } from '../utils/format'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseTextarea from '../components/ui/BaseTextarea.vue'

const route = useRoute()
const slug = route.params.slug as string

const quote = ref<QuoteDetail | null>(null)
const loading = ref(true)
const error = ref('')
const deciding = ref(false)
const action = ref<'none' | 'approved' | 'declined'>('none')
const comment = ref('')
const decisionError = ref('')

const primary = computed(() => quote.value?.business.primaryColor || '#2563EB')
const secondary = computed(() => quote.value?.business.secondaryColor || '#F97316')

async function load() {
  loading.value = true
  try {
    quote.value = await getPublicQuote(slug)
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
}

async function decide(approve: boolean) {
  deciding.value = true
  decisionError.value = ''
  try {
    if (approve) await approveQuote(slug, comment.value)
    else await declineQuote(slug, comment.value)
    action.value = approve ? 'approved' : 'declined'
    await load()
  } catch (err) {
    decisionError.value = errorMessage(err)
  } finally {
    deciding.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div v-if="loading" class="flex min-h-screen items-center justify-center text-gray-500">Carregando...</div>

    <div v-else-if="error" class="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 class="text-2xl font-bold text-gray-900">Orçamento não encontrado</h1>
      <p class="mt-2 text-gray-500">Este link pode estar incorreto ou o orçamento foi removido.</p>
    </div>

    <template v-else-if="quote">
      <!-- Header -->
      <header class="text-white" :style="{ backgroundColor: primary }">
        <div class="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
          <div>
            <h1 class="text-xl font-bold">{{ quote.business.name || 'Minha Empresa' }}</h1>
            <p class="text-sm opacity-90">{{ quote.business.phone || quote.business.email }}</p>
          </div>
          <img v-if="quote.business.logoUrl" :src="quote.business.logoUrl" class="h-12 w-12 rounded-lg bg-white object-contain p-1" alt="Logo" />
        </div>
      </header>

      <main class="mx-auto max-w-3xl px-4 py-6">
        <div class="rounded-2xl border border-gray-200 bg-white p-6">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-xs uppercase text-gray-400">Orçamento</p>
              <h2 class="text-xl font-bold text-gray-900">{{ quote.title }}</h2>
              <p class="text-sm text-gray-500">Emitido em {{ formatDate(quote.createdAt) }} · Válido por {{ quote.validityDays }} dia(s)</p>
            </div>
            <div class="text-right">
              <p class="text-xs text-gray-400">Cliente</p>
              <p class="font-medium text-gray-800">{{ quote.customer.name }}</p>
            </div>
          </div>

          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 text-left text-xs uppercase text-gray-400">
                <th class="py-2">Item</th>
                <th class="py-2 text-center">Qtd.</th>
                <th class="py-2 text-right">Preço</th>
                <th class="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in quote.items" :key="item.id" class="border-b border-gray-100">
                <td class="py-2">
                  <span class="font-medium text-gray-800">{{ item.name }}</span>
                  <p v-if="item.description" class="text-xs text-gray-500">{{ item.description }}</p>
                </td>
                <td class="py-2 text-center text-gray-600">{{ item.quantity }} {{ item.unit }}</td>
                <td class="py-2 text-right text-gray-600">{{ formatMoney(item.unitPrice) }}</td>
                <td class="py-2 text-right font-medium">{{ formatMoney(item.total) }}</td>
              </tr>
            </tbody>
          </table>

          <div class="mt-4 ml-auto w-full max-w-xs space-y-2 text-sm">
            <div class="flex justify-between text-gray-600"><span>Subtotal</span><span>{{ formatMoney(quote.subtotal) }}</span></div>
            <div v-if="quote.discountAmount > 0" class="flex justify-between text-orange-600"><span>Desconto</span><span>- {{ formatMoney(quote.discountAmount) }}</span></div>
            <div class="flex justify-between border-t border-gray-200 pt-2 text-lg font-bold text-gray-900"><span>Total</span><span>{{ formatMoney(quote.total) }}</span></div>
          </div>

          <div class="mt-6 space-y-2 border-t border-gray-100 pt-4 text-sm text-gray-600">
            <p v-if="quote.executionDays > 0"><span class="font-medium">Prazo de execução:</span> {{ quote.executionDays }} dia(s)</p>
            <p v-if="quote.paymentConditions"><span class="font-medium">Condições de pagamento:</span> {{ quote.paymentConditions }}</p>
            <p v-if="quote.notes"><span class="font-medium">Observações:</span> {{ quote.notes }}</p>
            <p v-if="quote.business.termsConditions"><span class="font-medium">Termos e condições:</span> {{ quote.business.termsConditions }}</p>
          </div>
        </div>

        <!-- Decision -->
        <div class="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
          <template v-if="action === 'approved'">
            <div class="text-center" :style="{ color: secondary }">
              <div class="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">✓</div>
              <h2 class="text-xl font-bold text-gray-900">Orçamento aprovado!</h2>
              <p class="mt-1 text-gray-500">Obrigado pela confirmação. Em breve entraremos em contato.</p>
            </div>
          </template>
          <template v-else-if="action === 'declined'">
            <div class="text-center">
              <div class="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl">✕</div>
              <h2 class="text-xl font-bold text-gray-900">Orçamento recusado</h2>
              <p class="mt-1 text-gray-500">Recebemos sua resposta. Se quiser, fale conosco para ajustar o orçamento.</p>
            </div>
          </template>
          <template v-else>
            <h2 class="font-semibold text-gray-900">Deseja aprovar este orçamento?</h2>
            <p class="mt-1 text-sm text-gray-500">Você pode adicionar um comentário opcional.</p>
            <div class="mt-4">
              <BaseTextarea v-model="comment" label="Comentário (opcional)" :rows="2" />
            </div>
            <div v-if="decisionError" class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ decisionError }}</div>
            <div class="mt-4 flex flex-wrap gap-2">
              <BaseButton :loading="deciding" @click="decide(true)">Aprovar orçamento</BaseButton>
              <BaseButton variant="outline" :loading="deciding" @click="decide(false)">Recusar orçamento</BaseButton>
            </div>
          </template>
        </div>

        <p class="mt-6 text-center text-xs text-gray-400">Documento gerado pelo OrçaPro</p>
      </main>
    </template>
  </div>
</template>
