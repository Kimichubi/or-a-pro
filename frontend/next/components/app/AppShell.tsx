'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, FileText, Users, Boxes, Building2, CreditCard, Shield, LogOut } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

const links = [
  { href: '/app', label: 'Painel', icon: LayoutDashboard },
  { href: '/app/orcamentos', label: 'Orçamentos', icon: FileText },
  { href: '/app/clientes', label: 'Clientes', icon: Users },
  { href: '/app/catalogo', label: 'Catálogo', icon: Boxes },
  { href: '/app/negocio', label: 'Meu negócio', icon: Building2 },
  { href: '/app/assinatura', label: 'Assinatura', icon: CreditCard },
]

export function AppShell({ children, name, isAdmin }: { children: React.ReactNode; name: string; isAdmin: boolean }) {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    try { await (await createSupabaseBrowserClient()).auth.signOut() } finally {
      router.replace('/login')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="border-b border-gray-200 bg-white px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:px-5 lg:py-7">
        <div className="flex items-center justify-between lg:block">
          <Link href="/app" className="font-display text-xl font-bold tracking-tight text-blue-800">OrçaPro</Link>
          <p className="hidden truncate pt-1 text-xs text-gray-500 lg:block">{name || 'Sua conta'}</p>
        </div>
        <nav className="mt-4 flex gap-1 overflow-x-auto lg:mt-8 lg:flex-col">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === '/app' ? pathname === href : pathname.startsWith(href)
            return <Link key={href} href={href} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition lg:w-full ${active ? 'bg-blue-50 text-blue-800' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}><Icon size={17} aria-hidden="true" />{label}</Link>
          })}
          {isAdmin && <Link href="/app/admin" className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition lg:w-full ${pathname.startsWith('/app/admin') ? 'bg-blue-50 text-blue-800' : 'text-gray-600 hover:bg-gray-100'}`}><Shield size={17} aria-hidden="true" />Administração</Link>}
        </nav>
        <button onClick={signOut} className="mt-5 hidden w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-600 hover:bg-gray-100 lg:flex"><LogOut size={17} aria-hidden="true" />Sair</button>
      </aside>
      <div className="min-w-0">
        <header className="hidden h-16 items-center justify-end border-b border-gray-200 bg-white px-8 lg:flex"><span className="text-sm text-gray-600">Olá, <strong className="font-semibold text-gray-900">{name || 'bem-vindo'}</strong></span></header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-7 sm:py-8">{children}</main>
      </div>
    </div>
  )
}
