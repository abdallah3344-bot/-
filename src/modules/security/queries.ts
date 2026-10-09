import 'server-only'

import { createClient } from '@/lib/supabase/server'

export type MySession = {
  id: string
  created_at: string
  last_active: string
  user_agent: string | null
  ip: string | null
  is_current: boolean
}

export type LoginEntry = { created_at: string; user_agent: string | null; ip: string | null }

export async function getMySessions(): Promise<MySession[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('my_sessions' as never)
  return (data ?? []) as MySession[]
}

export async function getMyLoginHistory(limit = 10): Promise<LoginEntry[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('my_login_history' as never, { p_limit: limit } as never)
  return (data ?? []) as LoginEntry[]
}

export async function getOfficeTermsStatus(): Promise<{ version: string | null; accepted_at: string | null } | null> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('office_terms_status' as never)
  return (data ?? null) as { version: string | null; accepted_at: string | null } | null
}
