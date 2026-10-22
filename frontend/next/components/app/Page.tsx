import Link from 'next/link'

export function Page({ title, description, action, children }: { title: string; description?: string; action?: { label: string; href: string }; children: React.ReactNode }) {
  return <div>
    <div className="workspace-page__header">
      <div>
        <h1 className="workspace-page__title">{title}</h1>
        {description && <p className="workspace-page__description">{description}</p>}
      </div>
      {action && <Link href={action.href} className="workspace-action">{action.label}</Link>}
    </div>
    {children}
  </div>
}

export function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`workspace-panel rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}>{children}</section>
}

export function Notice({ children, kind = 'error' }: { children: React.ReactNode; kind?: 'error' | 'success' | 'info' }) {
  const style = kind === 'success' ? 'border-green-200 bg-green-50 text-green-800' : kind === 'info' ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-red-200 bg-red-50 text-red-800'
  return <div role={kind === 'error' ? 'alert' : 'status'} className={`mt-4 rounded-xl border px-4 py-3 text-sm ${style}`}>{children}</div>
}

export function Loading({ children = 'Carregando…' }: { children?: React.ReactNode }) {
  return <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">{children}</div>
}
