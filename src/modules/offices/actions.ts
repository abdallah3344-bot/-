'use server'

import { TERMS_VERSION } from '@/modules/security/terms'
import { noteSession } from '@/modules/security/note-session'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { registerOfficeSchema, officeSlugSchema } from './schema'
import { attachOfficeDomain, detachOfficeDomain, officeHost } from '@/lib/cloudflare-domains'

export type RegisterResult =
  | { ok: true; done?: { site: string; signedIn: boolean } }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }

/** فحص فوري لرابط المكتب أثناء الكتابة في صفحة التسجيل. */
export async function checkOfficeSlugAction(slug: string): Promise<{ ok: boolean; error?: string }> {
  const parsed = officeSlugSchema.safeParse(slug)
  if (!parsed.success || !parsed.data) return { ok: false, error: parsed.error?.issues[0]?.message ?? 'أدخل الرابط' }
  const supabase = await createClient()
  const { data } = await supabase.rpc('office_slug_available', { _slug: parsed.data } as never)
  return (data as { ok: boolean; error?: string } | null) ?? { ok: false, error: 'تعذّر الفحص الآن' }
}

/** يطلب من Cloudflare ربط الرابط ويسجّل النتيجة لتظهر في صفحة المالك. */
async function linkOfficeDomain(officeId: string, slug: string) {
  const res = await attachOfficeDomain(slug)
  const supabase = await createClient()
  await supabase.rpc('set_office_domain_status', {
    _office: officeId,
    _slug: slug,
    _status: res.ok ? 'active' : res.notConfigured ? 'pending' : 'failed',
    _error: res.ok ? null : res.error,
  } as never)
  return res
}

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
    _slug: v.slug,
  } as never)

  if (error) return { ok: false, error: 'تعذّر تسجيل المكتب الآن. حاول بعد قليل.' }
  const result = data as { ok: boolean; error?: string; field?: string; office_id?: string } | null
  if (!result?.ok) {
    const error = result?.error ?? 'تعذّر تسجيل المكتب.'
    return result?.field ? { ok: false, error, fieldErrors: { [result.field]: error } } : { ok: false, error }
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: v.email,
    password: v.password,
  })
  // الربط بعد الدخول: تسجيل حالته يحتاج أن يكون المستخدم مدير المكتب
  if (!signInError && result.office_id) {
    await linkOfficeDomain(result.office_id, v.slug)
    // الموافقة على السياسة تُحفظ باسم مدير المكتب الذي سجّل
    await supabase.rpc('accept_office_terms' as never, { p_version: TERMS_VERSION } as never)
    await noteSession(supabase)
  }

  revalidatePath('/', 'layout')
  return { ok: true, done: { site: officeHost(v.slug), signedIn: !signInError } }
}

export type PlatformResult = { ok: true; warning?: string } | { ok: false; error: string }

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
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('platform_set_office_slug', { _office: officeId, _slug: parsed.data } as never)
  if (error) {
    return { ok: false, error: error.code === '23505' ? 'هذا الرابط مستخدم لمكتب آخر.' : error.message }
  }
  const r = data as { ok: boolean; error?: string; old: string | null; new: string | null }
  if (!r.ok) return { ok: false, error: r.error ?? 'تعذّر حفظ الرابط' }

  let warning: string | undefined
  if (r.new && r.new !== r.old) {
    const res = await linkOfficeDomain(officeId, r.new)
    if (!res.ok) warning = res.error
  }
  if (r.old && r.old !== r.new) await detachOfficeDomain(r.old)
  revalidatePath('/platform')
  return { ok: true, warning }
}

/** إعادة محاولة ربط رابط فشل أو بقي بانتظار الربط. */
export async function retryOfficeDomainAction(officeId: string, slug: string): Promise<PlatformResult> {
  if (!(await requirePlatformAdmin())) return { ok: false, error: 'هذه العملية لمالك المنصة فقط.' }
  const res = await linkOfficeDomain(officeId, slug)
  revalidatePath('/platform')
  return res.ok ? { ok: true } : { ok: false, error: res.error }
}
