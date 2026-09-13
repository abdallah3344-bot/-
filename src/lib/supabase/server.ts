import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * عميل Supabase للخادم — يقرأ جلسة المستخدم من الكوكيز.
 * كل استعلام يمرّ عبره يخضع لسياسات RLS بهوية المستخدم الحالي.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // الاستدعاء من Server Component — تحديث الجلسة يتكفّل به middleware
          }
        },
      },
    },
  )
}
