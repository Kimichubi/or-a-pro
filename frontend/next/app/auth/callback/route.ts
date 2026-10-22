import { NextResponse, type NextRequest } from 'next/server'
import { safeInternalPath } from '@/lib/redirects'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAppUrl } from '@/lib/stripe'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const target = safeInternalPath(request.nextUrl.searchParams.get('next'))
  const appUrl = getAppUrl()
  if (!appUrl) return NextResponse.json({ error: 'O endereço público do app ainda não está configurado.' }, { status: 503 })

  if (code) {
    try {
      const supabase = await createSupabaseServerClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) return NextResponse.redirect(new URL(target, appUrl))
    } catch {
      // Keep the error generic; provider details are not sent to the browser.
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_callback', appUrl))
}
