import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OrçaPro | Orçamentos profissionais para prestadores',
  description: 'Crie propostas profissionais, envie pelo WhatsApp e acompanhe as respostas dos seus clientes.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
