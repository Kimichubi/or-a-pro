import Link from 'next/link'
import { AuthPanel } from '@/components/auth/AuthPanel'
import { RegisterForm } from './RegisterForm'

export default function RegisterPage() {
  return (
    <AuthPanel title="Crie sua conta" subtitle="Comece a organizar seus orçamentos em poucos minutos." footer={<>Já tem uma conta? <Link href="/login" className="font-semibold text-blue-700 hover:underline">Entrar</Link></>}>
      <RegisterForm />
    </AuthPanel>
  )
}
