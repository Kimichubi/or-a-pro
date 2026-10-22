'use client'

import { useState, type FormEvent } from 'react'
import { AuthMessage } from '@/components/auth/AuthMessage'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const supabase = await createSupabaseBrowserClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=%2Freset-password`,
      })
      if (resetError) throw resetError
      setMessage('Se houver uma conta com esse e-mail, você receberá as instruções para redefinir a senha.')
    } catch {
      setError('Não foi possível solicitar a redefinição agora. Tente novamente mais tarde.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <label className="block text-sm font-semibold text-gray-700" htmlFor="email">E-mail da conta</label>
      <input id="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
      <AuthMessage text={error} />
      <AuthMessage text={message} kind="success" />
      <button disabled={busy} className="mt-6 w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{busy ? 'Enviando…' : 'Enviar instruções'}</button>
    </form>
  )
}
