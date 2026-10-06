<script setup lang="ts">
withDefaults(defineProps<{
  label?: string
  type?: string
  placeholder?: string
  modelValue: string | number
  error?: string
  hint?: string
  required?: boolean
  step?: string
}>(), { label: '', type: 'text', placeholder: '', error: '', hint: '', required: false, step: undefined })

defineEmits<{ (e: 'update:modelValue', v: string | number): void }>()
</script>

<template>
  <label class="block">
    <span v-if="label" class="mb-1 block text-sm font-medium text-gray-700">
      {{ label }}<span v-if="required" class="text-red-500"> *</span>
    </span>
    <input
      :type="type"
      :value="modelValue"
      :step="step"
      :placeholder="placeholder"
      :aria-invalid="!!error"
      class="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-100"
      :class="error ? 'border-red-400' : ''"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <span v-if="error" class="mt-1 block text-xs text-red-600">{{ error }}</span>
    <span v-else-if="hint" class="mt-1 block text-xs text-gray-400">{{ hint }}</span>
  </label>
</template>
