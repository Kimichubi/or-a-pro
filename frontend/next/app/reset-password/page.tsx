import Link from 'next/link'
import { AuthPanel } from '@/components/auth/AuthPanel'
import { ResetPasswordForm } from './ResetPasswordForm'

export default function ResetPasswordPage() {
  return (
    <AuthPanel title="Escolha uma nova senha" subtitle="Use pelo menos 8 caracteres para proteger sua conta." footer={<Link href="/login" className="font-semibold text-blue-700 hover:underline">Voltar para entrar</Link>}>
      <ResetPasswordForm />
    </AuthPanel>
  )
}
