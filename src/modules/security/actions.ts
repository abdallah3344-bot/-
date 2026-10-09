'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { logAudit } from '@/lib/audit'
import { TERMS_VERSION } from './terms'

export type SecurityResult = { ok: true; message: string } | { ok: false; error: string }

/** يُخرج جلسة واحدة من حساب المستخدم، أو كل جلساته الأخرى حين لا يُمرَّر معرّف. */
export async function endSessionsAction(sessionId?: string): Promise<SecurityResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'انتهت الجلسة. سجّل الدخول من جديد.' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('end_my_sessions' as never, { p_id: sessionId ?? null } as never)
  if (error) return { ok: false, error: 'تعذّر إخراج الأجهزة. حاول مجددًا.' }

  const n = Number(data ?? 0)
  await logAudit({
    action: 'logout', entity: 'auth',
    summary: sessionId ? 'إخراج جهاز من الحساب' : `إخراج كل الأجهزة الأخرى (${n})`,
  })
  revalidatePath('/profile')
  if (n === 0) return { ok: true, message: 'لا توجد أجهزة أخرى مفتوحة على حسابك.' }
  return { ok: true, message: sessionId ? 'تم إخراج الجهاز من حسابك.' : `تم إخراج ${n} من الأجهزة الأخرى.` }
}

/** موافقة مدير المكتب على الإصدار الحالي من سياسة الخصوصية وشروط الاستخدام. */
export async function acceptTermsAction(): Promise<SecurityResult> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('accept_office_terms' as never, { p_version: TERMS_VERSION } as never)
  if (error) return { ok: false, error: 'تعذّر حفظ الموافقة. الموافقة لمدير المكتب.' }
  revalidatePath('/', 'layout')
  return { ok: true, message: 'تم حفظ موافقتك على سياسة الخصوصية.' }
}
