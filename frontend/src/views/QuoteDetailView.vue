<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import axios from 'axios'
import {
  getQuote,
  sendQuote,
  setQuoteStatus,
  createReminder,
  quotePdfUrl,
} from '../api/quotes'
import { errorMessage, tokenStore } from '../api/client'
import type { QuoteDetail, QuoteStatus } from '../api/types'
import { formatMoney, formatDate, formatDateTime, daysSince } from '../utils/format'
import { openWhatsApp } from '../utils/whatsapp'
import StatusBadge from '../components/ui/StatusBadge.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseTextarea from '../components/ui/BaseTextarea.vue'
import BaseModal from '../components/ui/BaseModal.vue'

const route = useRoute()
const id = route.params.id as string

const quote = ref<QuoteDetail | null>(null)
const loading = ref(true)
const error = ref('')
const reminderOpen = ref(false)
const reminderText = ref('')
const reminderSaving = ref(false)
const linkCopied = ref(false)

const statusLabel: Record<string, string> = {
  draft: 'Rascunho',
  sent: 'Enviado',
  viewed: 'Visualizado',
  approved: 'Aprovado',
  declined: 'Recusado',
  expired: 'Expirado',
}

const daysPending = computed(() => {
  if (!quote.value) return 0
  return daysSince(quote.value.createdAt)
})

async function load() {
  loading.value = true
  try {
    quote.value = await getQuote(id)
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
}

async function send() {
  if (!quote.value) return
  try {
    const res = await sendQuote(id)
    await load()
    openWhatsApp(quote.value.customer.phone, res.message)
  } catch (err) {
    error.value = errorMessage(err)
  }
}

async function copyLink() {
  if (!quote.value) return
  const link = `${window.location.origin}/orcamento/${quote.value.slug}`
  try {
    await navigator.clipboard.writeText(link)
    linkCopied.value = true
    setTimeout(() => (linkCopied.value = false), 2000)
  } catch {
    error.value = 'Não foi possível copiar o link.'
  }
}

async function downloadPdf() {
  try {
    const res = await axios.get(quotePdfUrl(id), {
      responseType: 'blob',
      headers: { Authorization: `Bearer ${tokenStore.access}` },
    })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `orcamento-${quote.value?.slug.slice(0, 8)}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    error.value = errorMessage(err)
  }
}

async function changeStatus(status: QuoteStatus) {
  try {
    await setQuoteStatus(id, status)
    await load()
  } catch (err) {
    error.value = errorMessage(err)
  }
}

async function saveReminder() {
  reminderSaving.value = true
  try {
    const res = await createReminder(id, reminderText.value)
    reminderText.value = res.message
    await load()
    reminderOpen.value = false
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    reminderSaving.value = false
  }
}

function defaultReminder(): string {
  return quote.value
    ? `Olá, ${quote.value.customer.name}. Gostaria de saber se conseguiu analisar o orçamento enviado. Posso esclarecer alguma dúvida?`
    : ''
}

onMounted(load)
</script>

<template>
  <div>
    <div v-if="loading" class="py-20 text-center text-gray-500">Carregando...</div>

    <div v-else-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</div>

    <template v-else-if="quote">
      <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <RouterLink to="/app/orcamentos" class="text-sm text-blue-600 hover:underline">← Voltar</RouterLink>
          <div class="mt-1 flex items-center gap-3">
            <h1 class="text-2xl font-bold text-gray-900">{{ quote.title }}</h1>
            <StatusBadge :status="quote.status" />
          </div>
          <p class="text-sm text-gray-500">
            {{ quote.customer.name }} · Criado em {{ formatDate(quote.createdAt) }} · Parado há {{ daysPending }} dia(s)
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <BaseButton variant="secondary" @click="send">Enviar WhatsApp</BaseButton>
          <BaseButton variant="outline" @click="copyLink">{{ linkCopied ? 'Link copiado!' : 'Copiar link' }}</BaseButton>
          <BaseButton variant="outline" @click="downloadPdf">Baixar PDF</BaseButton>
          <RouterLink
            :to="`/app/orcamentos/${quote.id}/editar`"
            class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Editar
          </RouterLink>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Document -->
        <div class="lg:col-span-2">
          <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div class="border-b border-gray-100 bg-blue-600 px-6 py-4 text-white">
              <h2 class="font-bold">{{ quote.business.name || 'Minha Empresa' }}</h2>
              <p class="text-xs text-blue-100">{{ quote.business.phone || quote.business.email }}</p>
            </div>
            <div class="p-6">
              <div class="mb-4 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <p class="text-gray-400">CLIENTE</p>
                  <p class="font-medium text-gray-800">{{ quote.customer.name }}</p>
                  <p class="text-gray-500">{{ quote.customer.phone }}<template v-if="quote.customer.email"> · {{ quote.customer.email }}</template></p>
                </div>
                <div class="text-right">
                  <p class="text-gray-400">VALOR</p>
                  <p class="text-2xl font-bold text-gray-900">{{ formatMoney(quote.total) }}</p>
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
                <p v-if="quote.validityDays > 0"><span class="font-medium">Validade:</span> {{ quote.validityDays }} dia(s)</p>
                <p v-if="quote.paymentConditions"><span class="font-medium">Condições de pagamento:</span> {{ quote.paymentConditions }}</p>
                <p v-if="quote.notes"><span class="font-medium">Observações:</span> {{ quote.notes }}</p>
                <p v-if="quote.business.termsConditions"><span class="font-medium">Termos e condições:</span> {{ quote.business.termsConditions }}</p>
              </div>
            </div>
          </div>

          <!-- Client comment -->
          <div v-if="quote.status === 'approved' || quote.status === 'declined'" class="mt-4 rounded-2xl border border-gray-200 bg-white p-5">
            <p class="font-semibold text-gray-900">
              Cliente {{ quote.status === 'approved' ? 'aprovou' : 'recusou' }} o orçamento
            </p>
            <p class="text-sm text-gray-500">{{ formatDateTime(quote.status === 'approved' ? quote.approvedAt : quote.declinedAt) }}</p>
            <p v-if="quote.clientComment" class="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">“{{ quote.clientComment }}”</p>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <div class="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 class="font-semibold text-gray-900">Status</h3>
            <p class="mb-3 text-sm text-gray-500">{{ statusLabel[quote.status] }}</p>
            <div class="flex flex-wrap gap-2">
              <BaseButton size="sm" variant="outline" @click="changeStatus('sent')">Marcar enviado</BaseButton>
              <BaseButton size="sm" variant="outline" @click="changeStatus('viewed')">Marcar visualizado</BaseButton>
              <BaseButton size="sm" variant="outline" @click="changeStatus('approved')">Aprovar</BaseButton>
              <BaseButton size="sm" variant="outline" @click="changeStatus('declined')">Recusar</BaseButton>
              <BaseButton size="sm" variant="outline" @click="changeStatus('expired')">Expirar</BaseButton>
            </div>
          </div>

          <div class="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 class="mb-3 font-semibold text-gray-900">Acompanhamento</h3>
            <BaseButton size="sm" variant="secondary" block @click="reminderOpen = true; reminderText = defaultReminder()">
              Criar lembrete
            </BaseButton>
            <div v-if="(quote.reminders || []).length" class="mt-4 space-y-2">
              <div v-for="r in quote.reminders || []" :key="r.id" class="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                <p>{{ r.message }}</p>
                <p class="mt-1 text-xs text-gray-400">{{ formatDate(r.createdAt) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BaseModal :open="reminderOpen" title="Criar lembrete" @close="reminderOpen = false">
        <BaseTextarea v-model="reminderText" label="Mensagem de acompanhamento" :rows="3" />
        <div class="mt-4 flex justify-end gap-2">
          <BaseButton variant="outline" @click="reminderOpen = false">Cancelar</BaseButton>
          <BaseButton :loading="reminderSaving" @click="saveReminder">Salvar lembrete</BaseButton>
        </div>
      </BaseModal>
    </template>
  </div>
</template>
