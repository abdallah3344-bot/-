'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { registerOfficeSchema, officeSlugSchema } from './schema'

export type RegisterResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }

/**
 * تسجيل مكتب جديد: القاعدة تنشئ المكتب ومديره وتجهّز أدواره وقوائمه،
 * ثم ندخل بالحساب الجديد. المكتب لا يعمل حتى يُعتمد طلبه التجريبي
 * من لوحة التراخيص — بوابة الترخيص تعرض له حالة الانتظار.
 */
export async function registerOfficeAction(_prev: unknown, formData: FormData): Promise<RegisterResult> {
  const parsed = registerOfficeSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return { ok: false, error: 'يرجى تصحيح الحقول المحدّدة.', fieldErrors }
  }

  const v = parsed.data
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('register_office', {
    _office_name: v.officeName,
    _full_name: v.fullName,
    _username: v.username,
    _email: v.email,
    _password: v.password,
    _phone: v.phone,
  } as never)

  if (error) return { ok: false, error: 'تعذّر تسجيل المكتب الآن. حاول بعد قليل.' }
  const result = data as { ok: boolean; error?: string } | null
  if (!result?.ok) return { ok: false, error: result?.error ?? 'تعذّر تسجيل المكتب.' }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: v.email,
    password: v.password,
  })
  if (signInError) {
    // المكتب أُنشئ؛ الدخول اليدوي يكفي
    redirect('/login?registered=1')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export type PlatformResult = { ok: true } | { ok: false; error: string }

async function requirePlatformAdmin() {
  const user = await getCurrentUser()
  return user?.isPlatformAdmin ? user : null
}

export async function setOfficeActiveAction(officeId: string, active: boolean): Promise<PlatformResult> {
  if (!(await requirePlatformAdmin())) return { ok: false, error: 'هذه العملية لمالك المنصة فقط.' }
  const supabase = await createClient()
  const { error } = await supabase.rpc('platform_set_office_active', { _office: officeId, _active: active } as never)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/platform')
  return { ok: true }
}

export async function setOfficeSlugAction(officeId: string, slug: string): Promise<PlatformResult> {
  if (!(await requirePlatformAdmin())) return { ok: false, error: 'هذه العملية لمالك المنصة فقط.' }
  const parsed = officeSlugSchema.safeParse(slug)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'رابط غير صالح' }
  if (['law', 'www', 'kamal', 'alaraj', 'alnoor', 'almayar', 'demo', 'insurance', 'thaqafi'].includes(parsed.data)) {
    return { ok: false, error: 'هذا الاسم محجوز لبرنامج آخر.' }
  }
  const supabase = await createClient()
  const { error } = await supabase.rpc('platform_set_office_slug', { _office: officeId, _slug: parsed.data } as never)
  if (error) {
    return { ok: false, error: error.code === '23505' ? 'هذا الرابط مستخدم لمكتب آخر.' : error.message }
  }
  revalidatePath('/platform')
  return { ok: true }
}
