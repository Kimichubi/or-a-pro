import 'server-only'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type CurrentProfile = {
  id: string
  email: string
  name: string
  role: 'user' | 'admin'
  created_at?: string
}

export async function getCurrentUser() {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, name, role, created_at')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile) return null
    return { supabase, user, profile: profile as CurrentProfile }
  } catch {
    return null
  }
}

export async function requireUser(nextPath: string) {
  const current = await getCurrentUser()
  if (!current) redirect(`/login?redirect=${encodeURIComponent(nextPath)}`)
  return current
}

export async function requireAdmin(nextPath = '/app/admin') {
  const current = await requireUser(nextPath)
  if (current.profile.role !== 'admin') redirect('/app')
  return current
}
