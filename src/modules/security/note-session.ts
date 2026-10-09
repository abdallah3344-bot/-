import 'server-only'

import { headers } from 'next/headers'
import type { createClient } from '@/lib/supabase/server'

/** عنوان الزائر الحقيقي خلف Cloudflare. */
export function clientIp(h: Headers): string | null {
  return h.get('cf-connecting-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
}

/**
 * يحفظ جهاز الجلسة الجديدة وعنوانه بعد الدخول مباشرة. الدخول يجري على
 * الخادم، فلو تُرك لـ Supabase لسجّل جهاز الخادم وعنوانه بدل جهاز المستخدم.
 */
export async function noteSession(supabase: Awaited<ReturnType<typeof createClient>>) {
  try {
    const h = await headers()
    await supabase.rpc('note_my_session' as never, {
      p_user_agent: h.get('user-agent') ?? null,
      p_ip: clientIp(h),
    } as never)
  } catch {
    // لا يُفشل الدخول أبدًا
  }
}
