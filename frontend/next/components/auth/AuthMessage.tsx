'use client'

export function AuthMessage({ text, kind = 'error' }: { text: string; kind?: 'error' | 'success' }) {
  if (!text) return null
  const style = kind === 'success'
    ? 'border-green-200 bg-green-50 text-green-800'
    : 'border-red-200 bg-red-50 text-red-800'
  return <p role={kind === 'error' ? 'alert' : 'status'} className={`mt-4 rounded-xl border px-3 py-2.5 text-sm ${style}`}>{text}</p>
}
