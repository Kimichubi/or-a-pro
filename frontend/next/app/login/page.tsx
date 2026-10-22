import Link from 'next/link'
import { AuthPanel } from '@/components/auth/AuthPanel'
import { LoginForm } from './LoginForm'
import { safeInternalPath } from '@/lib/redirects'

type PageProps = { searchParams: Promise<{ redirect?: string | string[]; error?: string | string[] }> }

export default async function LoginPage({ searchParams }: PageProps) {
  const query = await searchParams
  const redirectValue = Array.isArray(query.redirect) ? query.redirect[0] : query.redirect
  const callbackError = query.error === 'auth_callback'
  return (
    <AuthPanel title="Que bom te ver" subtitle="Entre para acompanhar seus clientes e orçamentos." footer={<>Ainda não tem conta? <Link href="/register" className="font-semibold text-blue-700 hover:underline">Criar conta</Link></>}>
      <LoginForm redirectTo={safeInternalPath(redirectValue)} callbackError={callbackError} />
    </AuthPanel>
  )
}
