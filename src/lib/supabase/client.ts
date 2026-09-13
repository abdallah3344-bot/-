import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

/** عميل Supabase للمتصفح — يُستخدم في مكوّنات العميل فقط. */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
