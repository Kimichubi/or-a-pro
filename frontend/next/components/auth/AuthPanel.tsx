import { Brand } from '@/components/Brand'

export function AuthPanel({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-7 shadow-md sm:p-9">
        <Brand href="/" />
        <h1 className="mt-8 font-display text-3xl font-bold text-gray-900">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">{subtitle}</p>
        <div className="mt-7">{children}</div>
        {footer && <div className="mt-6 border-t border-gray-100 pt-5 text-center text-sm text-gray-600">{footer}</div>}
      </section>
    </main>
  )
}
