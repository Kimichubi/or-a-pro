<script setup lang="ts">
import { computed } from 'vue'
import type { QuoteStatus } from '../../api/types'

const props = defineProps<{ status: QuoteStatus }>()

const labels: Record<QuoteStatus, string> = {
  draft: 'Rascunho',
  sent: 'Enviado',
  viewed: 'Visualizado',
  approved: 'Aprovado',
  declined: 'Recusado',
  expired: 'Expirado',
}

const classes: Record<QuoteStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-indigo-100 text-indigo-700',
  approved: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  expired: 'bg-amber-100 text-amber-700',
}

const label = computed(() => labels[props.status])
const cls = computed(() => classes[props.status])
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
    :class="cls"
  >
    {{ label }}
  </span>
</template>
