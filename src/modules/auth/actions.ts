'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import {
  loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema,
} from './schema'

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }

/** رسالة موحّدة تمنع تعداد الحسابات: لا تكشف هل الخطأ في الاسم أم كلمة المرور. */
const INVALID_CREDENTIALS = 'بيانات الدخول غير صحيحة. تحقق من اسم المستخدم وكلمة المرور.'

export async function loginAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get('identifier'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return { ok: false, error: 'يرجى تصحيح الحقول المحدّدة.', fieldErrors }
  }

  const { identifier, password } = parsed.data
  const supabase = await createClient()

  // يقبل اسم المستخدم أو البريد. الدالة لا تُرجع البريد
  // إلا بعد التحقق من كلمة المرور، فلا يمكن تعداد الحسابات.
  const { data: email, error: resolveError } = await supabase.rpc('resolve_login_email', {
    identifier,
    password,
  } as never)

  if (resolveError || !email || typeof email !== 'string') {
    await logAudit({
      action: 'login_failed',
      entity: 'auth',
      summary: `محاولة دخول فاشلة بالمعرّف: ${identifier}`,
    })
    return { ok: false, error: INVALID_CREDENTIALS }
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

  if (signInError) {
    await logAudit({
      action: 'login_failed',
      entity: 'auth',
      summary: `محاولة دخول فاشلة بالمعرّف: ${identifier}`,
    })
    return { ok: false, error: INVALID_CREDENTIALS }
  }

  await supabase
    .from('profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('email', email)

  await logAudit({ action: 'login', entity: 'auth', summary: 'تسجيل دخول ناجح' })

  const redirectTo = formData.get('redirect')
  const target =
    typeof redirectTo === 'string' && redirectTo.startsWith('/') && !redirectTo.startsWith('//')
      ? redirectTo
      : '/dashboard'

  revalidatePath('/', 'layout')
  redirect(target)
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient()
  await logAudit({ action: 'logout', entity: 'auth', summary: 'تسجيل خروج' })
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function forgotPasswordAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') })

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة' }
  }

  const supabase = await createClient()
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/reset-password`,
  })

  // الرد موحّد دائمًا سواء وُجد البريد أم لا.
  return {
    ok: true,
    message: 'إذا كان هذا البريد مسجّلًا لدينا، فقد أُرسل إليه رابط إعادة التعيين.',
  }
}

export async function resetPasswordAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return { ok: false, error: 'يرجى تصحيح الحقول المحدّدة.', fieldErrors }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'انتهت صلاحية رابط إعادة التعيين. اطلب رابطًا جديدًا.' }
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { ok: false, error: 'تعذّر تحديث كلمة المرور. حاول مجددًا.' }

  await logAudit({ action: 'password_change', entity: 'auth', summary: 'إعادة تعيين كلمة المرور' })
  return { ok: true, message: 'تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.' }
}

export async function changePasswordAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return { ok: false, error: 'يرجى تصحيح الحقول المحدّدة.', fieldErrors }
  }

  const supabase = await createClient()

  // إعادة التحقق من كلمة المرور الحالية قبل السماح بالتغيير
  const { data: valid } = await supabase.rpc('verify_my_password', {
    _password: parsed.data.currentPassword,
  } as never)

  if (valid !== true) {
    return {
      ok: false,
      error: 'كلمة المرور الحالية غير صحيحة.',
      fieldErrors: { currentPassword: 'كلمة المرور الحالية غير صحيحة' },
    }
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { ok: false, error: 'تعذّر تحديث كلمة المرور. حاول مجددًا.' }

  await logAudit({ action: 'password_change', entity: 'auth', summary: 'تغيير كلمة المرور' })
  return { ok: true, message: 'تم تغيير كلمة المرور بنجاح.' }
}
