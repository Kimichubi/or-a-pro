import { requireUser } from '@/lib/auth'
import { AppShell } from '@/components/app/AppShell'

export default async function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const current = await requireUser('/app')
  return <AppShell name={current.profile.name} isAdmin={current.profile.role === 'admin'}>{children}</AppShell>
}
