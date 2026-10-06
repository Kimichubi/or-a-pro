<script setup lang="ts">
withDefaults(defineProps<{
  label?: string
  modelValue: string
  placeholder?: string
  rows?: number
  error?: string
}>(), { label: '', placeholder: '', rows: 3, error: '' })

defineEmits<{ (e: 'update:modelValue', v: string): void }>()
</script>

<template>
  <label class="block">
    <span v-if="label" class="mb-1 block text-sm font-medium text-gray-700">{{ label }}</span>
    <textarea
      :value="modelValue"
      :rows="rows"
      :placeholder="placeholder"
      :aria-invalid="!!error"
      class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-100"
      :class="error ? 'border-red-400' : ''"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <span v-if="error" class="mt-1 block text-xs text-red-600">{{ error }}</span>
  </label>
</template>
