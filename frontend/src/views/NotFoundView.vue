<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppLogo from '../components/AppLogo.vue'
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
    <AppLogo />
    <h1 class="mt-6 text-3xl font-bold text-gray-900">Página não encontrada</h1>
    <p class="mt-2 text-gray-500">O endereço que você acessou não existe.</p>
    <RouterLink to="/" class="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
      Voltar ao início
    </RouterLink>
  </div>
</template>
