<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { listCustomers, createCustomer, updateCustomer, deleteCustomer, type CustomerPayload } from '../api/customers'
import { errorMessage } from '../api/client'
import type { Customer } from '../api/types'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseInput from '../components/ui/BaseInput.vue'
import BaseTextarea from '../components/ui/BaseTextarea.vue'
import BaseModal from '../components/ui/BaseModal.vue'

const customers = ref<Customer[]>([])
const search = ref('')
const loading = ref(true)

const modalOpen = ref(false)
const editing = ref<Customer | null>(null)
const saving = ref(false)
const error = ref('')

const form = ref<CustomerPayload>({
  name: '',
  phone: '',
  email: '',
  document: '',
  serviceAddress: '',
  notes: '',
})

async function load() {
  loading.value = true
  try {
    customers.value = await listCustomers(search.value)
  } finally {
    loading.value = false
  }
}

function openNew() {
  editing.value = null
  form.value = { name: '', phone: '', email: '', document: '', serviceAddress: '', notes: '' }
  error.value = ''
  modalOpen.value = true
}

function openEdit(c: Customer) {
  editing.value = c
  form.value = {
    name: c.name,
    phone: c.phone,
    email: c.email,
    document: c.document,
    serviceAddress: c.serviceAddress,
    notes: c.notes,
  }
  error.value = ''
  modalOpen.value = true
}

async function save() {
  if (!form.value.name) {
    error.value = 'Nome é obrigatório.'
    return
  }
  saving.value = true
  error.value = ''
  try {
    if (editing.value) {
      await updateCustomer(editing.value.id, form.value)
    } else {
      await createCustomer(form.value)
    }
    modalOpen.value = false
    await load()
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    saving.value = false
  }
}

async function remove(c: Customer) {
  if (!confirm(`Excluir cliente "${c.name}"?`)) return
  await deleteCustomer(c.id)
  await load()
}

onMounted(load)
</script>

<template>
  <div>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Clientes</h1>
        <p class="text-sm text-gray-500">Cadastre e gerencie seus clientes.</p>
      </div>
      <BaseButton @click="openNew">+ Novo cliente</BaseButton>
    </div>

    <div class="mb-4 max-w-sm">
      <BaseInput v-model="search" placeholder="Buscar por nome ou telefone..." @keyup.enter="load" />
    </div>

    <div v-if="loading" class="py-20 text-center text-gray-500">Carregando...</div>

    <div v-else-if="customers.length === 0" class="rounded-2xl border border-gray-200 bg-white px-6 py-14 text-center" role="status">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-800">
        <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="10" cy="7" r="4" />
          <path d="M19 8v6m-3-3h6" />
        </svg>
      </div>
      <h2 class="mt-4 font-display text-lg font-semibold text-gray-900">{{ search ? 'Nenhum cliente encontrado' : 'Comece por um cliente' }}</h2>
      <p class="mx-auto mt-1 max-w-md text-sm leading-6 text-gray-500">{{ search ? `Não encontramos clientes para “${search}”.` : 'Guarde nome e contato para montar orçamentos e enviar propostas pelo WhatsApp.' }}</p>
      <BaseButton v-if="!search" class="mt-5" @click="openNew">Cadastrar primeiro cliente</BaseButton>
      <BaseButton v-else class="mt-5" variant="outline" @click="search = ''; load()">Limpar busca</BaseButton>
    </div>

    <div v-else class="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <ul class="divide-y divide-gray-100">
        <li v-for="c in customers" :key="c.id" class="flex items-center justify-between px-5 py-3">
          <div>
            <p class="font-medium text-gray-800">{{ c.name }}</p>
            <p class="text-sm text-gray-500">
              {{ c.phone || 'Sem telefone' }}<template v-if="c.email"> · {{ c.email }}</template>
            </p>
          </div>
          <div class="flex gap-2">
            <button class="rounded-lg px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50" @click="openEdit(c)">Editar</button>
            <button class="rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50" @click="remove(c)">Excluir</button>
          </div>
        </li>
      </ul>
    </div>

    <BaseModal :open="modalOpen" :title="editing ? 'Editar cliente' : 'Novo cliente'" @close="modalOpen = false">
      <form class="space-y-4" @submit.prevent="save">
        <BaseInput v-model="form.name" label="Nome" required />
        <div class="grid gap-4 sm:grid-cols-2">
          <BaseInput v-model="form.phone" label="Telefone" />
          <BaseInput v-model="form.email" label="E-mail" type="email" />
        </div>
        <BaseInput v-model="form.document" label="CPF/CNPJ (opcional)" />
        <BaseInput v-model="form.serviceAddress" label="Endereço do serviço" />
        <BaseTextarea v-model="form.notes" label="Observações" :rows="2" />
        <div v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</div>
        <div class="flex justify-end gap-2 pt-2">
          <BaseButton variant="outline" @click="modalOpen = false">Cancelar</BaseButton>
          <BaseButton type="submit" :loading="saving">Salvar</BaseButton>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
