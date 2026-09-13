import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PermissionSet, type Action, type Module } from './permissions'

export type CurrentUser = {
  id: string
  email: string
  username: string
  fullName: string
  jobTitle: string | null
  phone: string | null
  avatarUrl: string | null
  roleCode: string
  roleName: string
  permissions: PermissionSet
}

/**
 * المستخدم الحالي مع صلاحياته الفعّالة.
 * مغلّفة بـ cache() ⇒ استعلام واحد لكل طلب مهما تكرّر الاستدعاء.
 * تُرجع null إن لم توجد جلسة صالحة.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const [{ data: profile }, { data: perms }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, full_name, email, phone, job_title, avatar_url, is_active, roles(code, name_ar)')
      .eq('id', user.id)
      .maybeSingle(),
    supabase.rpc('my_permissions'),
  ])

  if (!profile || !profile.is_active) return null

  const role = (profile as { roles?: { code: string; name_ar: string } | null }).roles

  return {
    id: profile.id,
    email: profile.email,
    username: profile.username,
    fullName: profile.full_name,
    jobTitle: profile.job_title,
    phone: profile.phone,
    avatarUrl: profile.avatar_url,
    roleCode: role?.code ?? 'custom',
    roleName: role?.name_ar ?? 'غير محدّد',
    permissions: new PermissionSet(
      Array.isArray(perms) ? (perms as { code: string }[]).map((p) => p.code) : [],
    ),
  }
})

/** يضمن وجود جلسة، وإلا يعيد التوجيه لصفحة الدخول. */
export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}

/**
 * الطبقة الثانية من الحماية: يضمن امتلاك المستخدم للصلاحية
 * قبل تنفيذ أي استعلام. انظر docs/ARCHITECTURE.md §4.3.
 */
export async function requirePermission(module: Module, action: Action): Promise<CurrentUser> {
  const user = await requireAuth()
  if (!user.permissions.can(module, action)) {
    redirect(`/forbidden?module=${module}&action=${action}`)
  }
  return user
}

/** نسخة لا تعيد التوجيه — تُستخدم داخل Server Actions لإرجاع خطأ منظّم. */
export async function checkPermission(
  module: Module,
  action: Action,
): Promise<{ ok: true; user: CurrentUser } | { ok: false; error: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'انتهت الجلسة. يرجى تسجيل الدخول مجددًا.' }
  if (!user.permissions.can(module, action)) {
    return { ok: false, error: 'ليس لديك صلاحية لتنفيذ هذه العملية.' }
  }
  return { ok: true, user }
}
