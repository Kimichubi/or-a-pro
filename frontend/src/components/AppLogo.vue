<script setup lang="ts">
withDefaults(defineProps<{ size?: 'sm' | 'md' | 'lg'; variant?: 'default' | 'inverse' }>(), { size: 'md', variant: 'default' })
</script>

<template>
  <span class="inline-flex items-center gap-2">
    <span
      class="flex items-center justify-center rounded-xl"
      :class="[variant === 'inverse' ? 'bg-orange-400 text-blue-900' : 'bg-blue-600 text-white', size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10']"
    >
      <svg class="h-1/2 w-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2l2.4 4.9 5.6.8-4 3.9.9 5.6-4.9-2.6L7 17.2l.9-5.6-4-3.9 5.6-.8L12 2z" />
      </svg>
    </span>
    <span
      class="font-display font-bold tracking-tight"
      :class="[size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl', variant === 'inverse' ? 'text-white' : 'text-gray-900']"
    >
      Orça<span class="text-orange-500">Pro</span>
    </span>
  </span>
</template>
