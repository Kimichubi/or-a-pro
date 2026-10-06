<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { listCatalog, createCatalogItem, updateCatalogItem, deleteCatalogItem, type CatalogPayload } from '../api/catalog'
import { errorMessage } from '../api/client'
import type { CatalogItem } from '../api/types'
import { formatMoney } from '../utils/format'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseInput from '../components/ui/BaseInput.vue'
import BaseTextarea from '../components/ui/BaseTextarea.vue'
import BaseModal from '../components/ui/BaseModal.vue'

const items = ref<CatalogItem[]>([])
const search = ref('')
const loading = ref(true)

const modalOpen = ref(false)
const editing = ref<CatalogItem | null>(null)
const saving = ref(false)
const error = ref('')

const form = ref<CatalogPayload>({
  name: '',
  description: '',
  unit: 'un',
  price: 0,
  estimatedCost: 0,
  category: '',
})

async function load() {
  loading.value = true
  try {
    items.value = await listCatalog(search.value)
  } finally {
    loading.value = false
  }
}

function openNew() {
  editing.value = null
  form.value = { name: '', description: '', unit: 'un', price: 0, estimatedCost: 0, category: '' }
  error.value = ''
  modalOpen.value = true
}

function openEdit(item: CatalogItem) {
  editing.value = item
  form.value = {
    name: item.name,
    description: item.description,
    unit: item.unit,
    price: item.price,
    estimatedCost: item.estimatedCost,
    category: item.category,
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
      await updateCatalogItem(editing.value.id, form.value)
    } else {
      await createCatalogItem(form.value)
    }
    modalOpen.value = false
    await load()
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    saving.value = false
  }
}

async function remove(item: CatalogItem) {
  if (!confirm(`Excluir "${item.name}"?`)) return
  await deleteCatalogItem(item.id)
  await load()
}

onMounted(load)
</script>

<template>
  <div>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Catálogo</h1>
        <p class="text-sm text-gray-500">Serviços e produtos para usar nos orçamentos.</p>
      </div>
      <BaseButton @click="openNew">+ Novo item</BaseButton>
    </div>

    <div class="mb-4 max-w-sm">
      <BaseInput v-model="search" placeholder="Buscar por nome ou categoria..." @keyup.enter="load" />
    </div>

    <div v-if="loading" class="py-20 text-center text-gray-500">Carregando...</div>

    <div v-else-if="items.length === 0" class="rounded-2xl border border-gray-200 bg-white px-6 py-14 text-center" role="status">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-800">
        <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H20v16H5.5A1.5 1.5 0 0 1 4 18.5z" />
          <path d="M4 18.5A1.5 1.5 0 0 1 5.5 17H20M8 8h8m-8 4h5" />
          <path d="M17 7v6m-3-3h6" />
        </svg>
      </div>
      <h2 class="mt-4 font-display text-lg font-semibold text-gray-900">{{ search ? 'Nenhum item encontrado' : 'Monte seu catálogo' }}</h2>
      <p class="mx-auto mt-1 max-w-md text-sm leading-6 text-gray-500">{{ search ? `Não encontramos itens para “${search}”.` : 'Cadastre serviços e materiais com preço padrão para montar novos orçamentos com mais rapidez.' }}</p>
      <BaseButton v-if="!search" class="mt-5" @click="openNew">Adicionar primeiro item</BaseButton>
      <BaseButton v-else class="mt-5" variant="outline" @click="search = ''; load()">Limpar busca</BaseButton>
    </div>

    <div v-else class="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <ul class="divide-y divide-gray-100">
        <li v-for="item in items" :key="item.id" class="flex items-center justify-between px-5 py-3">
          <div>
            <p class="font-medium text-gray-800">{{ item.name }}</p>
            <p class="text-sm text-gray-500">
              <span v-if="item.category" class="mr-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs">{{ item.category }}</span>
              {{ item.unit }} · {{ formatMoney(item.price) }}
            </p>
          </div>
          <div class="flex gap-2">
            <button class="rounded-lg px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50" @click="openEdit(item)">Editar</button>
            <button class="rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50" @click="remove(item)">Excluir</button>
          </div>
        </li>
      </ul>
    </div>

    <BaseModal :open="modalOpen" :title="editing ? 'Editar item' : 'Novo item'" @close="modalOpen = false">
      <form class="space-y-4" @submit.prevent="save">
        <BaseInput v-model="form.name" label="Nome" required />
        <BaseTextarea v-model="form.description" label="Descrição" :rows="2" />
        <div class="grid gap-4 sm:grid-cols-2">
          <BaseInput v-model="form.unit" label="Unidade" placeholder="un, m, h..." />
          <BaseInput v-model="form.category" label="Categoria" />
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <BaseInput v-model="form.price" label="Preço padrão (R$)" type="number" step="0.01" />
          <BaseInput v-model="form.estimatedCost" label="Custo estimado (R$)" type="number" step="0.01" />
        </div>
        <div v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</div>
        <div class="flex justify-end gap-2 pt-2">
          <BaseButton variant="outline" @click="modalOpen = false">Cancelar</BaseButton>
          <BaseButton type="submit" :loading="saving">Salvar</BaseButton>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
