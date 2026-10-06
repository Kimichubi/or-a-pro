<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { updateBusiness, uploadLogo } from '../api/business'
import { errorMessage } from '../api/client'
import BaseInput from '../components/ui/BaseInput.vue'
import BaseTextarea from '../components/ui/BaseTextarea.vue'
import BaseButton from '../components/ui/BaseButton.vue'

const auth = useAuthStore()
const form = reactive({
  name: '',
  logoUrl: '',
  document: '',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  primaryColor: '#2563EB',
  secondaryColor: '#F97316',
  termsConditions: '',
})
const saving = ref(false)
const message = ref('')
const error = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

onMounted(() => {
  if (auth.business) {
    form.name = auth.business.name
    form.logoUrl = auth.business.logoUrl
    form.document = auth.business.document
    form.phone = auth.business.phone
    form.whatsapp = auth.business.whatsapp
    form.email = auth.business.email
    form.address = auth.business.address
    form.primaryColor = auth.business.primaryColor
    form.secondaryColor = auth.business.secondaryColor
    form.termsConditions = auth.business.termsConditions
  }
})

async function save() {
  saving.value = true
  message.value = ''
  error.value = ''
  try {
    const updated = await updateBusiness(form)
    auth.setBusiness(updated)
    message.value = 'Configurações salvas!'
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    saving.value = false
  }
}

async function onLogoChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  error.value = ''
  try {
    const url = await uploadLogo(file)
    form.logoUrl = url
  } catch (err) {
    error.value = errorMessage(err)
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <h1 class="mb-1 text-2xl font-bold text-gray-900">Meu Negócio</h1>
    <p class="mb-6 text-sm text-gray-500">Estas informações aparecem nos seus orçamentos e PDFs.</p>

    <div class="space-y-5 rounded-2xl border border-gray-200 bg-white p-6">
      <div class="flex items-center gap-4">
        <div
          class="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
        >
          <img v-if="form.logoUrl" :src="form.logoUrl" class="h-full w-full object-cover" alt="Logo" />
          <span v-else class="text-2xl text-gray-300">🖼️</span>
        </div>
        <div>
          <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onLogoChange" />
          <BaseButton variant="outline" size="sm" @click="fileInput?.click()">Enviar logo</BaseButton>
          <p class="mt-1 text-xs text-gray-400">PNG, JPG ou WEBP (máx. 2MB)</p>
        </div>
      </div>

      <BaseInput v-model="form.name" label="Nome comercial" required />
      <BaseInput v-model="form.document" label="CNPJ ou CPF" placeholder="00.000.000/0000-00" />
      <div class="grid gap-4 sm:grid-cols-2">
        <BaseInput v-model="form.phone" label="Telefone" placeholder="(00) 0000-0000" />
        <BaseInput v-model="form.whatsapp" label="WhatsApp" placeholder="(00) 00000-0000" />
      </div>
      <BaseInput v-model="form.email" label="E-mail" type="email" />
      <BaseInput v-model="form.address" label="Endereço" />

      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block">
          <span class="mb-1 block text-sm font-medium text-gray-700">Cor principal</span>
          <input v-model="form.primaryColor" type="color" class="h-10 w-full rounded-lg border border-gray-300" />
        </label>
        <label class="block">
          <span class="mb-1 block text-sm font-medium text-gray-700">Cor secundária</span>
          <input v-model="form.secondaryColor" type="color" class="h-10 w-full rounded-lg border border-gray-300" />
        </label>
      </div>

      <BaseTextarea
        v-model="form.termsConditions"
        label="Termos e condições padrão"
        :rows="4"
        placeholder="Ex: Prazo de entrega após confirmação. Garantia de 90 dias..."
      />

      <div v-if="message" class="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{{ message }}</div>
      <div v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</div>

      <BaseButton :loading="saving" @click="save">Salvar configurações</BaseButton>
    </div>
  </div>
</template>
