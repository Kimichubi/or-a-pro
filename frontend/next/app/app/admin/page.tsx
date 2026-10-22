import { requireAdmin } from '@/lib/auth'
import { Admin } from '@/components/app/Admin'

export default async function AdminPage() {
  await requireAdmin('/app/admin')
  return <Admin />
}
