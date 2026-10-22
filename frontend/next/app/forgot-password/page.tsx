import Link from 'next/link'
import { AuthPanel } from '@/components/auth/AuthPanel'
import { ForgotPasswordForm } from './ForgotPasswordForm'

export default function ForgotPasswordPage() {
  return (
    <AuthPanel title="Redefinir senha" subtitle="Informe o e-mail da conta para receber as instruções." footer={<Link href="/login" className="font-semibold text-blue-700 hover:underline">Voltar para entrar</Link>}>
      <ForgotPasswordForm />
    </AuthPanel>
  )
}
