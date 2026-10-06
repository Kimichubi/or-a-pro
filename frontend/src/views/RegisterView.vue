<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AppLogo from '../components/AppLogo.vue'
import BaseInput from '../components/ui/BaseInput.vue'
import BaseButton from '../components/ui/BaseButton.vue'

const auth = useAuthStore()
const router = useRouter()

const name = ref('')
const email = ref('')
const password = ref('')
const confirm = ref('')
const error = ref('')

async function submit() {
  error.value = ''
  if (!name.value || !email.value || !password.value) {
    error.value = 'Preencha todos os campos.'
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
  const ok = await auth.register(name.value, email.value, password.value)
  if (ok) {
    router.push('/app')
  } else {
    error.value = auth.error
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
    <div class="w-full max-w-md">
      <div class="mb-6 flex justify-center"><AppLogo /></div>
      <div class="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 class="text-xl font-bold text-gray-900">Criar conta</h1>
        <p class="mt-1 text-sm text-gray-500">Comece a criar orçamentos profissionais gratuitamente.</p>
        <form class="mt-6 space-y-4" @submit.prevent="submit">
          <BaseInput v-model="name" label="Nome do negócio" placeholder="Ex: Eletro Silva" required />
          <BaseInput v-model="email" label="E-mail" type="email" placeholder="voce@email.com" required />
          <BaseInput v-model="password" label="Senha" type="password" placeholder="Mínimo 8 caracteres" required />
          <BaseInput v-model="confirm" label="Confirmar senha" type="password" placeholder="Repita a senha" required />
          <div v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</div>
          <BaseButton type="submit" :loading="auth.loading" block>Criar conta</BaseButton>
        </form>
      </div>
      <p class="mt-4 text-center text-sm text-gray-500">
        Já tem conta?
        <RouterLink to="/login" class="font-medium text-blue-600 hover:underline">Entrar</RouterLink>
      </p>
    </div>
  </div>
</template>
