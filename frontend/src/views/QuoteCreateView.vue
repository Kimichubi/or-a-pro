<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { listCustomers } from '../api/customers'
import { listCatalog } from '../api/catalog'
import { createQuote, getQuote, updateQuote, type QuotePayload } from '../api/quotes'
import { errorMessage } from '../api/client'
import type { CatalogItem, Customer, QuoteItemInput } from '../api/types'
import { formatMoney } from '../utils/format'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseInput from '../components/ui/BaseInput.vue'
import BaseSelect from '../components/ui/BaseSelect.vue'
import BaseTextarea from '../components/ui/BaseTextarea.vue'

const route = useRoute()
const router = useRouter()
const editId = route.params.id as string | undefined

const customers = ref<Customer[]>([])
const catalog = ref<CatalogItem[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')

const customerId = ref('')
const title = ref('')
const discountAmount = ref(0)
const executionDays = ref(0)
const validityDays = ref(7)
const notes = ref('')
const paymentConditions = ref('')

const items = ref<QuoteItemInput[]>([])
const catalogPick = ref('')

const subtotal = computed(() => items.value.reduce((s, i) => s + i.quantity * i.unitPrice, 0))
const total = computed(() => Math.max(0, subtotal.value - discountAmount.value))

const customerOptions = computed(() =>
  customers.value.map((c) => ({ value: c.id, label: c.name })),
)
const catalogOptions = computed(() =>
  catalog.value.map((c) => ({ value: c.id, label: `${c.name} — ${formatMoney(c.price)}` })),
)

async function load() {
  loading.value = true
  try {
    const [cust, cat] = await Promise.all([listCustomers(), listCatalog()])
    customers.value = cust
    catalog.value = cat
    if (editId) {
      const quote = await getQuote(editId)
      customerId.value = quote.customerId
      title.value = quote.title
      discountAmount.value = quote.discountAmount
      executionDays.value = quote.executionDays
      validityDays.value = quote.validityDays
      notes.value = quote.notes
      paymentConditions.value = quote.paymentConditions
      items.value = quote.items.map((i) => ({
        catalogItemId: i.catalogItemId,
        name: i.name,
        description: i.description,
        unit: i.unit,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      }))
    }
  } finally {
    loading.value = false
  }
}

function addFromCatalog() {
  const item = catalog.value.find((c) => c.id === catalogPick.value)
  if (!item) return
  items.value.push({
    catalogItemId: item.id,
    name: item.name,
    description: item.description,
    unit: item.unit,
    quantity: 1,
    unitPrice: item.price,
  })
  catalogPick.value = ''
}

function addManual() {
  items.value.push({
    catalogItemId: null,
    name: '',
    description: '',
    unit: 'un',
    quantity: 1,
    unitPrice: 0,
  })
}

function removeItem(index: number) {
  items.value.splice(index, 1)
}

async function save() {
  error.value = ''
  if (!customerId.value) {
    error.value = 'Selecione um cliente.'
    return
  }
  if (items.value.length === 0) {
    error.value = 'Adicione ao menos um item.'
    return
  }
  const invalid = items.value.find((i) => !i.name || i.quantity <= 0)
  if (invalid) {
    error.value = 'Todos os itens precisam de nome e quantidade maior que zero.'
    return
  }

  const payload: QuotePayload = {
    customerId: customerId.value,
    title: title.value || 'Orçamento',
    discountAmount: discountAmount.value,
    executionDays: executionDays.value,
    validityDays: validityDays.value,
    notes: notes.value,
    paymentConditions: paymentConditions.value,
    items: items.value,
  }

  saving.value = true
  try {
    const quote = editId ? await updateQuote(editId, payload) : await createQuote(payload)
    router.push(`/app/orcamentos/${quote.id}`)
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">{{ editId ? 'Editar orçamento' : 'Novo orçamento' }}</h1>
      <p class="text-sm text-gray-500">Selecione o cliente, adicione serviços e materiais e o total é calculado automaticamente.</p>
    </div>

    <div v-if="loading" class="py-20 text-center text-gray-500">Carregando...</div>

    <template v-else>
      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Main -->
        <div class="space-y-6 lg:col-span-2">
          <div class="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 class="mb-4 font-semibold text-gray-900">Dados do orçamento</h2>
            <div class="space-y-4">
              <BaseSelect v-model="customerId" label="Cliente" required :options="customerOptions" />
              <BaseInput v-model="title" label="Título do serviço" placeholder="Ex: Instalação de chuveiro" />
              <div class="grid gap-4 sm:grid-cols-2">
                <BaseInput v-model="executionDays" label="Prazo de execução (dias)" type="number" />
                <BaseInput v-model="validityDays" label="Validade (dias)" type="number" />
              </div>
              <BaseTextarea v-model="paymentConditions" label="Condições de pagamento" :rows="2" placeholder="Ex: 50% de entrada e 50% na conclusão" />
              <BaseTextarea v-model="notes" label="Observações" :rows="2" />
            </div>
          </div>

          <div class="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 class="mb-4 font-semibold text-gray-900">Serviços e materiais</h2>
            <div class="mb-4 flex flex-wrap items-end gap-2">
              <div class="flex-1 min-w-[200px]">
                <BaseSelect v-model="catalogPick" label="Adicionar do catálogo" :options="catalogOptions" placeholder="Escolha um item..." />
              </div>
              <BaseButton variant="outline" @click="addFromCatalog">Adicionar</BaseButton>
              <BaseButton variant="ghost" @click="addManual">+ Item manual</BaseButton>
            </div>

            <div v-if="items.length === 0" class="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-400">
              Nenhum item adicionado. Escolha do catálogo ou adicione manualmente.
            </div>

            <div v-else class="space-y-3">
              <div v-for="(item, idx) in items" :key="idx" class="rounded-xl border border-gray-200 p-3">
                <div class="flex items-start justify-between gap-2">
                  <div class="grid flex-1 gap-2 sm:grid-cols-2">
                    <BaseInput v-model="item.name" label="Nome" />
                    <BaseInput v-model="item.description" label="Descrição" />
                  </div>
                  <button class="mt-5 text-gray-400 hover:text-red-600" @click="removeItem(idx)">
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
                  </button>
                </div>
                <div class="mt-2 grid gap-2 sm:grid-cols-4">
                  <BaseInput v-model="item.unit" label="Unidade" />
                  <BaseInput v-model="item.quantity" label="Qtd." type="number" step="0.01" />
                  <BaseInput v-model="item.unitPrice" label="Preço unit." type="number" step="0.01" />
                  <div class="flex items-end pb-1 text-sm font-medium text-gray-700">
                    {{ formatMoney(item.quantity * item.unitPrice) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Summary -->
        <div class="space-y-6">
          <div class="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 class="mb-4 font-semibold text-gray-900">Resumo</h2>
            <div class="space-y-3 text-sm">
              <div class="flex justify-between text-gray-600"><span>Subtotal</span><span class="font-medium">{{ formatMoney(subtotal) }}</span></div>
              <div class="flex items-center justify-between gap-2 text-gray-600">
                <span>Desconto</span>
                <input v-model="discountAmount" type="number" step="0.01" class="w-28 rounded-lg border border-gray-300 px-2 py-1 text-right" />
              </div>
              <div class="flex justify-between border-t border-gray-200 pt-3 text-lg font-bold text-gray-900">
                <span>Total</span><span>{{ formatMoney(total) }}</span>
              </div>
            </div>
          </div>

          <div v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</div>

          <div class="flex gap-2">
            <BaseButton variant="outline" @click="router.back()">Cancelar</BaseButton>
            <BaseButton :loading="saving" @click="save">Salvar orçamento</BaseButton>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
