'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { AuthMessage } from '@/components/auth/AuthMessage'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export function LoginForm({ redirectTo, callbackError }: { redirectTo: string; callbackError: boolean }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(callbackError ? 'Não foi possível concluir a autenticação. Tente entrar novamente.' : '')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const supabase = await createSupabaseBrowserClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (signInError) {
        setError('E-mail ou senha inválidos.')
        return
      }
      router.replace(redirectTo)
      router.refresh()
    } catch {
      setError('Não foi possível entrar. Confira a conexão e tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <label className="block text-sm font-semibold text-gray-700" htmlFor="email">E-mail</label>
      <input id="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
      <label className="mt-5 block text-sm font-semibold text-gray-700" htmlFor="password">Senha</label>
      <input id="password" type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
      <div className="mt-3 text-right"><Link href="/forgot-password" className="text-sm font-medium text-blue-700 hover:underline">Esqueci minha senha</Link></div>
      <AuthMessage text={error} />
      <button disabled={busy} className="mt-6 w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60">
        {busy ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
