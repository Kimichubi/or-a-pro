export function safeInternalPath(value: string | null | undefined, fallback = '/app') {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback
  return value
}
