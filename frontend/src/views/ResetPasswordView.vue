<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { resetPassword } from '../api/auth'
import AppLogo from '../components/AppLogo.vue'
import BaseInput from '../components/ui/BaseInput.vue'
import BaseButton from '../components/ui/BaseButton.vue'

const route = useRoute()

const password = ref('')
const confirm = ref('')
const loading = ref(false)
const error = ref('')
const done = ref(false)

async function submit() {
  error.value = ''
  const token = route.query.token as string
  if (!token) {
    error.value = 'Link inválido.'
    return
  }
  if (password.value.length < 8) {
    error.value = 'A senha deve ter pelo menos 8 caracteres.'
    return
  }
  if (password.value !== confirm.value) {
    error.value = 'As senhas não coincidem.'
    return
  }
  loading.value = true
  try {
    await resetPassword(token, password.value)
    done.value = true
  } catch {
    error.value = 'Link inválido ou expirado.'
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
        <template v-if="!done">
          <h1 class="text-xl font-bold text-gray-900">Definir nova senha</h1>
          <form class="mt-6 space-y-4" @submit.prevent="submit">
            <BaseInput v-model="password" label="Nova senha" type="password" placeholder="Mínimo 8 caracteres" required />
            <BaseInput v-model="confirm" label="Confirmar nova senha" type="password" required />
            <div v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</div>
            <BaseButton type="submit" :loading="loading" block>Salvar nova senha</BaseButton>
          </form>
        </template>
        <template v-else>
          <div class="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            Senha atualizada com sucesso!
          </div>
          <RouterLink to="/login" class="mt-4 block text-center text-sm text-blue-600 hover:underline">
            Fazer login
          </RouterLink>
        </template>
      </div>
    </div>
  </div>
</template>
