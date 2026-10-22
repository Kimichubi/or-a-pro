'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, FileText, Users, Boxes, Building2, CreditCard, Shield, LogOut } from 'lucide-react'
import { Brand } from '@/components/Brand'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

const links = [
  { href: '/app', label: 'Painel', icon: LayoutDashboard },
  { href: '/app/orcamentos', label: 'Orçamentos', icon: FileText },
  { href: '/app/clientes', label: 'Clientes', icon: Users },
  { href: '/app/catalogo', label: 'Catálogo', icon: Boxes },
  { href: '/app/negocio', label: 'Meu negócio', icon: Building2 },
  { href: '/app/assinatura', label: 'Assinatura', icon: CreditCard },
]

function initials(value: string) {
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'OP'
}

export function AppShell({ children, name, isAdmin }: { children: React.ReactNode; name: string; isAdmin: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const displayName = name || 'Sua conta'

  async function signOut() {
    try {
      await (await createSupabaseBrowserClient()).auth.signOut()
    } finally {
      router.replace('/login')
      router.refresh()
    }
  }

  function renderLink(href: string, label: string, Icon: typeof LayoutDashboard) {
    const active = href === '/app' ? pathname === href : pathname.startsWith(href)
    return (
      <Link
        key={href}
        href={href}
        className="app-nav-link"
        data-active={active}
        aria-current={active ? 'page' : undefined}
      >
        <Icon size={18} aria-hidden="true" />
        <span>{label}</span>
      </Link>
    )
  }

  return (
    <div className="app-shell lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="app-sidebar">
        <div className="app-sidebar__brand"><Brand href="/app" inverse /></div>
        <p className="app-sidebar__caption">Seu espaço</p>
        <nav className="app-sidebar__nav" aria-label="Navegação da plataforma">
          {links.map(({ href, label, icon }) => renderLink(href, label, icon))}
          {isAdmin && renderLink('/app/admin', 'Administração', Shield)}
        </nav>
        <div className="app-sidebar__footer">
          <div className="app-user">
            <span className="app-user__avatar">{initials(displayName)}</span>
            <span className="app-user__name">{displayName}</span>
          </div>
          <button className="app-signout" onClick={signOut}>
            <LogOut size={17} aria-hidden="true" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="app-mobile-header">
          <Brand href="/app" size="small" />
          <button className="app-mobile-signout" onClick={signOut} aria-label="Sair da conta" title="Sair da conta">
            <LogOut size={18} aria-hidden="true" />
          </button>
        </header>
        <nav className="app-mobile-nav" aria-label="Navegação da plataforma">
          {links.map(({ href, label, icon }) => renderLink(href, label, icon))}
          {isAdmin && renderLink('/app/admin', 'Administração', Shield)}
        </nav>
        <header className="app-topbar">
          <div>
            <span className="app-topbar__caption">Seu espaço de trabalho</span>
            <p>Olá, {displayName}</p>
          </div>
          <span className="app-topbar__avatar" aria-hidden="true">{initials(displayName)}</span>
        </header>
        <main className="app-main">{children}</main>
      </div>
    </div>
  )
}
