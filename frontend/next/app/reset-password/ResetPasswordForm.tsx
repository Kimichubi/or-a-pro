'use client'

import { useState, type FormEvent } from 'react'
import { AuthMessage } from '@/components/auth/AuthMessage'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    setBusy(true)
    try {
      const supabase = await createSupabaseBrowserClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setSuccess('Senha atualizada. Você já pode entrar com a nova senha.')
      setPassword('')
      setConfirmPassword('')
    } catch {
      setError('O link expirou ou já foi utilizado. Solicite novas instruções.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <label className="block text-sm font-semibold text-gray-700" htmlFor="password">Nova senha</label>
      <input id="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
      <label className="mt-4 block text-sm font-semibold text-gray-700" htmlFor="confirm-password">Confirme a senha</label>
      <input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
      <AuthMessage text={error} />
      <AuthMessage text={success} kind="success" />
      <button disabled={busy} className="mt-6 w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{busy ? 'Salvando…' : 'Salvar senha'}</button>
    </form>
  )
}
