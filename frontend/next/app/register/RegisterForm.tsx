'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { AuthMessage } from '@/components/auth/AuthMessage'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export function RegisterForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setBusy(true)
    try {
      const supabase = await createSupabaseBrowserClient()
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=%2Fapp`,
        },
      })
      if (signUpError) {
        setError(signUpError.code === 'user_already_exists' ? 'Não foi possível criar a conta com esses dados.' : 'Não foi possível criar a conta. Confira os campos e tente novamente.')
        return
      }
      if (data.session) {
        router.replace('/app')
        router.refresh()
        return
      }
      setSuccess('Conta criada. Confira seu e-mail para confirmar o cadastro e entrar.')
    } catch {
      setError('O cadastro não está disponível neste ambiente. Tente novamente mais tarde.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <label className="block text-sm font-semibold text-gray-700" htmlFor="name">Seu nome</label>
      <input id="name" autoComplete="name" required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
      <label className="mt-4 block text-sm font-semibold text-gray-700" htmlFor="email">E-mail</label>
      <input id="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
      <label className="mt-4 block text-sm font-semibold text-gray-700" htmlFor="password">Senha</label>
      <input id="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
      <p className="mt-2 text-xs text-gray-500">Use pelo menos 8 caracteres.</p>
      <AuthMessage text={error} />
      <AuthMessage text={success} kind="success" />
      <button disabled={busy} className="mt-6 w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{busy ? 'Criando conta…' : 'Criar minha conta'}</button>
      <p className="mt-4 text-center text-xs leading-5 text-gray-500">Ao continuar, você concorda com os termos de uso e a política de privacidade.</p>
    </form>
  )
}
