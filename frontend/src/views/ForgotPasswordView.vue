<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { forgotPassword } from '../api/auth'
import AppLogo from '../components/AppLogo.vue'
import BaseInput from '../components/ui/BaseInput.vue'
import BaseButton from '../components/ui/BaseButton.vue'

const email = ref('')
const loading = ref(false)
const sent = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  if (!email.value) {
    error.value = 'Informe seu e-mail.'
    return
  }
  loading.value = true
  try {
    await forgotPassword(email.value)
    sent.value = true
  } catch {
    error.value = 'Não foi possível enviar. Tente novamente.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4">
    <div class="w-full max-w-md">
      <div class="mb-6 flex justify-center"><AppLogo /></div>
      <div class="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <template v-if="!sent">
          <h1 class="text-xl font-bold text-gray-900">Recuperar senha</h1>
          <p class="mt-1 text-sm text-gray-500">Informe seu e-mail e enviaremos um link de redefinição.</p>
          <form class="mt-6 space-y-4" @submit.prevent="submit">
            <BaseInput v-model="email" label="E-mail" type="email" placeholder="voce@email.com" required />
            <div v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</div>
            <BaseButton type="submit" :loading="loading" block>Enviar link</BaseButton>
          </form>
        </template>
        <template v-else>
          <div class="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.
          </div>
          <RouterLink to="/login" class="mt-4 block text-center text-sm text-blue-600 hover:underline">
            Voltar para o login
          </RouterLink>
        </template>
      </div>
      <p class="mt-4 text-center text-sm text-gray-500">
        <RouterLink to="/login" class="font-medium text-blue-600 hover:underline">Voltar para o login</RouterLink>
      </p>
    </div>
  </div>
</template>
