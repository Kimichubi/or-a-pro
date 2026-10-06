<script setup lang="ts">
import { RouterView } from 'vue-router'
import { restoringSession } from './router'
</script>

<template>
  <div v-if="restoringSession" class="flex min-h-screen items-center justify-center bg-gray-50 px-6" role="status" aria-live="polite">
    <div class="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 text-sm font-medium text-gray-700 shadow-sm">
      <span class="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" aria-hidden="true" />
      Carregando seu espaço...
    </div>
  </div>
  <RouterView v-else />
</template>
