<script setup lang="ts">
withDefaults(defineProps<{
  label?: string
  modelValue: string
  error?: string
  required?: boolean
  options: { value: string; label: string }[]
  placeholder?: string
}>(), { label: '', error: '', required: false, placeholder: 'Selecione...' })

defineEmits<{ (e: 'update:modelValue', v: string): void }>()
</script>

<template>
  <label class="block">
    <span v-if="label" class="mb-1 block text-sm font-medium text-gray-700">
      {{ label }}<span v-if="required" class="text-red-500"> *</span>
    </span>
    <select
      :value="modelValue"
      :aria-invalid="!!error"
      class="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-100"
      :class="error ? 'border-red-400' : ''"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option value="" disabled>{{ placeholder }}</option>
      <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
    <span v-if="error" class="mt-1 block text-xs text-red-600">{{ error }}</span>
  </label>
</template>
