<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AppLogo from '../components/AppLogo.vue'
import BaseInput from '../components/ui/BaseInput.vue'
import BaseButton from '../components/ui/BaseButton.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const error = ref('')

async function submit() {
  error.value = ''
  if (!email.value || !password.value) {
    error.value = 'Preencha e-mail e senha.'
    return
  }
  const ok = await auth.login(email.value, password.value)
  if (ok) {
    router.push((route.query.redirect as string) || '/app')
  } else {
    error.value = auth.error
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4">
    <div class="w-full max-w-md">
      <div class="mb-6 flex justify-center"><AppLogo /></div>
      <div class="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 class="text-xl font-bold text-gray-900">Entrar</h1>
        <p class="mt-1 text-sm text-gray-500">Acesse sua conta para gerenciar orçamentos.</p>
        <form class="mt-6 space-y-4" @submit.prevent="submit">
          <BaseInput v-model="email" label="E-mail" type="email" placeholder="voce@email.com" required />
          <BaseInput v-model="password" label="Senha" type="password" placeholder="••••••••" required />
          <div class="text-right">
            <RouterLink to="/forgot-password" class="text-sm text-blue-600 hover:underline">
              Esqueci minha senha
            </RouterLink>
          </div>
          <div v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</div>
          <BaseButton type="submit" :loading="auth.loading" block>Entrar</BaseButton>
        </form>
      </div>
      <p class="mt-4 text-center text-sm text-gray-500">
        Não tem conta?
        <RouterLink to="/register" class="font-medium text-blue-600 hover:underline">Criar conta</RouterLink>
      </p>
    </div>
  </div>
</template>
