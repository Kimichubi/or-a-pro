<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { errorMessage } from '../api/client'
import { getAdminOverview, listAdminBusinesses, listAdminCustomers, updateAdminCustomer } from '../api/admin'
import type { AdminBusiness, AdminCustomer, AdminOverview } from '../api/types'
import type { CustomerPayload } from '../api/customers'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseInput from '../components/ui/BaseInput.vue'
import BaseTextarea from '../components/ui/BaseTextarea.vue'
import BaseModal from '../components/ui/BaseModal.vue'

const overview = ref<AdminOverview | null>(null)
const businesses = ref<AdminBusiness[]>([])
const customers = ref<AdminCustomer[]>([])
const activeTab = ref<'businesses' | 'customers'>('businesses')
const search = ref('')
const selectedBusiness = ref<AdminBusiness | null>(null)
const loading = ref(false)
const pageError = ref('')
const modalOpen = ref(false)
const editing = ref<AdminCustomer | null>(null)
const saving = ref(false)
const formError = ref('')
const form = ref<CustomerPayload>(emptyForm())

function emptyForm(): CustomerPayload {
  return { name: '', phone: '', email: '', document: '', serviceAddress: '', notes: '' }
}

async function loadOverview() {
  overview.value = await getAdminOverview()
}

async function loadBusinesses() {
  businesses.value = await listAdminBusinesses(search.value)
}

async function loadCustomers() {
  customers.value = await listAdminCustomers(search.value, selectedBusiness.value?.businessId || '')
}

async function load() {
  loading.value = true
  pageError.value = ''
  try {
    await loadOverview()
    if (activeTab.value === 'businesses') await loadBusinesses()
    else await loadCustomers()
  } catch (err) {
    pageError.value = errorMessage(err)
  } finally {
    loading.value = false
  }
}

async function chooseTab(tab: 'businesses' | 'customers') {
  activeTab.value = tab
  selectedBusiness.value = null
  search.value = ''
  await load()
}

async function showBusinessCustomers(business: AdminBusiness) {
  selectedBusiness.value = business
  activeTab.value = 'customers'
  search.value = ''
  await load()
}

async function clearFilters() {
  search.value = ''
  selectedBusiness.value = null
  await load()
}

function openEdit(customer: AdminCustomer) {
  editing.value = customer
  form.value = {
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    document: customer.document,
    serviceAddress: customer.serviceAddress,
    notes: customer.notes,
  }
  formError.value = ''
  modalOpen.value = true
}

async function saveCustomer() {
  if (!form.value.name.trim()) {
    formError.value = 'Informe o nome do cliente.'
    return
  }
  if (!editing.value) return
  saving.value = true
  formError.value = ''
  try {
    await updateAdminCustomer(editing.value.id, form.value)
    modalOpen.value = false
    await load()
  } catch (err) {
    formError.value = errorMessage(err)
  } finally {
    saving.value = false
  }
}

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

onMounted(load)
</script>

<template>
  <section>
    <header class="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Área restrita</p>
        <h1 class="mt-1 text-3xl font-bold tracking-tight text-gray-950">Backoffice</h1>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-gray-500">Acompanhe os negócios cadastrados na plataforma e gerencie os dados dos clientes.</p>
      </div>
      <BaseButton variant="outline" :loading="loading" aria-label="Atualizar dados do backoffice" @click="load">Atualizar dados</BaseButton>
    </header>

    <div v-if="pageError" class="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{{ pageError }}</div>

    <div class="mb-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <article v-for="stat in [
        { label: 'Contas', value: overview?.accounts ?? '—', hint: 'usuários cadastrados' },
        { label: 'Negócios', value: overview?.businesses ?? '—', hint: 'espaços de trabalho' },
        { label: 'Clientes', value: overview?.customers ?? '—', hint: 'em toda a plataforma' },
        { label: 'Orçamentos', value: overview?.quotes ?? '—', hint: `aprovados: ${money(overview?.approvedSum ?? 0)}` },
      ]" :key="stat.label" class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p class="text-sm font-medium text-gray-500">{{ stat.label }}</p>
        <p class="mt-2 text-3xl font-bold tracking-tight text-gray-950">{{ stat.value }}</p>
        <p class="mt-1 text-xs text-gray-400">{{ stat.hint }}</p>
      </article>
    </div>

    <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
        <div>
          <h2 class="font-semibold text-gray-900">Gestão da plataforma</h2>
          <p class="mt-1 text-xs text-gray-500">Consulte e atualize cadastros.</p>
        </div>
        <div class="flex rounded-lg bg-gray-100 p-1" role="tablist" aria-label="Seção administrativa">
          <button class="rounded-md px-3 py-2 text-sm font-medium transition" :class="activeTab === 'businesses' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'" role="tab" :aria-selected="activeTab === 'businesses'" @click="chooseTab('businesses')">Negócios</button>
          <button class="rounded-md px-3 py-2 text-sm font-medium transition" :class="activeTab === 'customers' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'" role="tab" :aria-selected="activeTab === 'customers'" @click="chooseTab('customers')">Clientes</button>
        </div>
      </div>

      <div class="flex flex-wrap items-end gap-3 border-b border-gray-100 px-5 py-4">
        <div class="w-full max-w-md">
          <BaseInput v-model="search" :label="activeTab === 'businesses' ? 'Buscar negócio ou responsável' : 'Buscar cliente, negócio ou e-mail'" placeholder="Digite para buscar..." @keyup.enter="load" />
        </div>
        <BaseButton :loading="loading" @click="load">Buscar</BaseButton>
        <BaseButton variant="outline" :disabled="!search && !selectedBusiness" @click="clearFilters">Limpar</BaseButton>
        <span v-if="selectedBusiness" class="rounded-full bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">{{ selectedBusiness.businessName }} <button class="ml-2 underline" aria-label="Remover filtro de negócio" @click="clearFilters">remover</button></span>
      </div>

      <div v-if="loading" class="p-12 text-center text-sm text-gray-500" role="status">Carregando dados...</div>
      <div v-else-if="activeTab === 'businesses' && businesses.length === 0" class="p-12 text-center text-sm text-gray-500" role="status">Nenhum negócio encontrado para esta busca.</div>
      <div v-else-if="activeTab === 'customers' && customers.length === 0" class="p-12 text-center text-sm text-gray-500" role="status">Nenhum cliente encontrado para esta busca.</div>

      <div v-else-if="activeTab === 'businesses'" class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-left text-sm">
          <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th class="px-5 py-3 font-semibold">Negócio</th><th class="px-5 py-3 font-semibold">Responsável</th><th class="px-5 py-3 font-semibold">Clientes</th><th class="px-5 py-3 font-semibold">Orçamentos</th><th class="px-5 py-3 text-right font-semibold">Ação</th></tr></thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="business in businesses" :key="business.businessId" class="hover:bg-gray-50/70">
              <td class="px-5 py-4"><p class="font-semibold text-gray-900">{{ business.businessName || 'Negócio sem nome' }}</p><p class="mt-1 text-xs text-gray-500">{{ business.phone || business.email || 'Sem contato cadastrado' }}</p></td>
              <td class="px-5 py-4"><p class="text-gray-800">{{ business.ownerName }}</p><p class="mt-1 text-xs text-gray-500">{{ business.ownerEmail }}</p></td>
              <td class="px-5 py-4 text-gray-700">{{ business.customerCount }}</td>
              <td class="px-5 py-4 text-gray-700">{{ business.quoteCount }}</td>
              <td class="px-5 py-4 text-right"><BaseButton size="sm" variant="outline" @click="showBusinessCustomers(business)">Ver clientes</BaseButton></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-left text-sm">
          <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th class="px-5 py-3 font-semibold">Cliente</th><th class="px-5 py-3 font-semibold">Contato</th><th class="px-5 py-3 font-semibold">Negócio</th><th class="px-5 py-3 font-semibold">Responsável</th><th class="px-5 py-3 text-right font-semibold">Ação</th></tr></thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="customer in customers" :key="customer.id" class="hover:bg-gray-50/70">
              <td class="px-5 py-4"><p class="font-semibold text-gray-900">{{ customer.name }}</p><p class="mt-1 text-xs text-gray-500">{{ customer.serviceAddress || 'Sem endereço de atendimento' }}</p></td>
              <td class="px-5 py-4"><p class="text-gray-800">{{ customer.phone || 'Sem telefone' }}</p><p class="mt-1 text-xs text-gray-500">{{ customer.email || 'Sem e-mail' }}</p></td>
              <td class="px-5 py-4 text-gray-700">{{ customer.businessName }}</td>
              <td class="px-5 py-4 text-gray-600">{{ customer.ownerEmail }}</td>
              <td class="px-5 py-4 text-right"><BaseButton size="sm" variant="outline" @click="openEdit(customer)">Editar</BaseButton></td>
            </tr>
          </tbody>
        </table>
      </div>
      <footer v-if="!loading && (activeTab === 'businesses' ? businesses.length : customers.length)" class="border-t border-gray-100 px-5 py-3 text-xs text-gray-400">{{ activeTab === 'businesses' ? businesses.length + ' negócios listados' : customers.length + ' clientes listados' }}</footer>
    </div>

    <BaseModal :open="modalOpen" title="Editar cliente" @close="modalOpen = false">
      <form class="space-y-4" @submit.prevent="saveCustomer">
        <div class="grid gap-4 sm:grid-cols-2">
          <BaseInput v-model="form.name" label="Nome" required :error="formError && !form.name.trim() ? formError : ''" />
          <BaseInput v-model="form.phone" label="Telefone" type="tel" placeholder="(11) 99999-0000" />
          <BaseInput v-model="form.email" label="E-mail" type="email" />
          <BaseInput v-model="form.document" label="CPF/CNPJ" />
        </div>
        <BaseInput v-model="form.serviceAddress" label="Endereço de atendimento" />
        <BaseTextarea v-model="form.notes" label="Observações" :rows="3" />
        <p v-if="formError" class="text-sm text-red-600" role="alert">{{ formError }}</p>
        <div class="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <BaseButton variant="outline" @click="modalOpen = false">Cancelar</BaseButton>
          <BaseButton type="submit" :loading="saving">Salvar alterações</BaseButton>
        </div>
      </form>
    </BaseModal>
  </section>
</template>
