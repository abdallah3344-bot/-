'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { checkPermission, getCurrentUser } from '@/lib/auth/session'
import { logAudit, diffChanges } from '@/lib/audit'
import {
  createUserSchema, updateUserSchema, resetUserPasswordSchema, updateProfileSchema,
} from './schema'
import type { ActionResult } from '@/modules/auth/actions'

/** يحوّل أخطاء zod إلى خريطة أخطاء حقول. */
function fieldErrorsOf(issues: { path: (string | number | symbol)[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {}
  for (const issue of issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return fieldErrors
}

export async function createUserAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const guard = await checkPermission('users', 'create')
  if (!guard.ok) return { ok: false, error: guard.error }

  const parsed = createUserSchema.safeParse({
    fullName: formData.get('fullName'),
    username: formData.get('username'),
    email: formData.get('email'),
    password: formData.get('password'),
    roleCode: formData.get('roleCode'),
    phone: formData.get('phone'),
    jobTitle: formData.get('jobTitle'),
  })

  if (!parsed.success) {
    return {
      ok: false,
      error: 'يرجى تصحيح الحقول المحدّدة.',
      fieldErrors: fieldErrorsOf(parsed.error.issues),
    }
  }

  const input = parsed.data
  const supabase = await createClient()

  const { data: userId, error } = await supabase.rpc('create_office_user', {
    _email: input.email,
    _password: input.password,
    _username: input.username,
    _full_name: input.fullName,
    _role_code: input.roleCode,
    _phone: input.phone || undefined,
    _job_title: input.jobTitle || undefined,
  } as never)

  if (error) {
    // رسائل الدالة عربية أصلًا، فنعرضها كما هي عند وضوحها.
    const message = error.message.includes('مستخدم مسبقًا')
      ? error.message
      : `تعذّر إنشاء المستخدم: ${error.message}`

    const fieldErrors: Record<string, string> = {}
    if (error.message.includes('البريد')) fieldErrors.email = error.message
    if (error.message.includes('اسم المستخدم')) fieldErrors.username = error.message

    return {
      ok: false,
      error: message,
      fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined,
    }
  }

  revalidatePath('/users')
  return { ok: true, message: `تم إنشاء المستخدم «${input.fullName}» بنجاح.`, }
}

export async function updateUserAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const guard = await checkPermission('users', 'update')
  if (!guard.ok) return { ok: false, error: guard.error }

  const parsed = updateUserSchema.safeParse({
    id: formData.get('id'),
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    roleCode: formData.get('roleCode'),
    phone: formData.get('phone'),
    jobTitle: formData.get('jobTitle'),
    isActive: formData.get('isActive') === 'on' || formData.get('isActive') === 'true',
  })

  if (!parsed.success) {
    return {
      ok: false,
      error: 'يرجى تصحيح الحقول المحدّدة.',
      fieldErrors: fieldErrorsOf(parsed.error.issues),
    }
  }

  const input = parsed.data
  const supabase = await createClient()

  // منع المستخدم من تعطيل حسابه أو خفض دوره بنفسه — وإلا قد يُقفل النظام.
  if (input.id === guard.user.id) {
    if (!input.isActive) {
      return { ok: false, error: 'لا يمكنك تعطيل حسابك الشخصي.' }
    }
    if (input.roleCode !== guard.user.roleCode) {
      return { ok: false, error: 'لا يمكنك تغيير دور حسابك الشخصي.' }
    }
  }

  const { data: role } = await supabase
    .from('roles').select('id').eq('code', input.roleCode).maybeSingle()

  if (!role) return { ok: false, error: 'الدور المحدّد غير موجود.' }

  const { data: before } = await supabase
    .from('profiles')
    .select('full_name, email, phone, job_title, is_active, role_id')
    .eq('id', input.id)
    .maybeSingle()

  // منع تعطيل آخر مدير نظام فعّال
  if (before && !input.isActive) {
    const stillAdmin = await countActiveSuperAdminsExcluding(input.id)
    if (stillAdmin === 0) {
      return { ok: false, error: 'لا يمكن تعطيل آخر مدير نظام فعّال في النظام.' }
    }
  }

  const patch = {
    full_name: input.fullName,
    email: input.email,
    phone: input.phone || null,
    job_title: input.jobTitle || null,
    is_active: input.isActive,
    role_id: role.id,
  }

  const { error } = await supabase.from('profiles').update(patch).eq('id', input.id)
  if (error) return { ok: false, error: `تعذّر حفظ التعديلات: ${error.message}` }

  const changed = before ? diffChanges(before, patch) : {}
  await logAudit({
    action: 'update',
    entity: 'profiles',
    entityId: input.id,
    entityLabel: input.fullName,
    summary: 'تعديل بيانات مستخدم',
    changes: changed,
  })

  if (before && before.role_id !== role.id) {
    await logAudit({
      action: 'permission_change',
      entity: 'profiles',
      entityId: input.id,
      entityLabel: input.fullName,
      summary: `تغيير الدور إلى ${input.roleCode}`,
    })
  }

  revalidatePath('/users')
  revalidatePath(`/users/${input.id}`)
  return { ok: true, message: 'تم حفظ التعديلات بنجاح.' }
}

/** يعدّ مديري النظام الفعّالين عدا المستخدم المحدّد. */
async function countActiveSuperAdminsExcluding(userId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('profiles')
    .select('id, roles!inner(code)', { count: 'exact', head: true })
    .eq('roles.code', 'super_admin')
    .eq('is_active', true)
    .is('deleted_at', null)
    .neq('id', userId)
  return count ?? 0
}

export async function resetUserPasswordAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await checkPermission('users', 'update')
  if (!guard.ok) return { ok: false, error: guard.error }

  const parsed = resetUserPasswordSchema.safeParse({
    id: formData.get('id'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return {
      ok: false,
      error: 'يرجى تصحيح الحقول المحدّدة.',
      fieldErrors: fieldErrorsOf(parsed.error.issues),
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('set_user_password', {
    _user_id: parsed.data.id,
    _password: parsed.data.password,
  } as never)

  if (error) return { ok: false, error: `تعذّر إعادة تعيين كلمة المرور: ${error.message}` }

  return { ok: true, message: 'تم تعيين كلمة مرور جديدة للمستخدم.' }
}

export async function deleteUserAction(id: string): Promise<ActionResult> {
  const guard = await checkPermission('users', 'delete')
  if (!guard.ok) return { ok: false, error: guard.error }

  if (id === guard.user.id) {
    return { ok: false, error: 'لا يمكنك حذف حسابك الشخصي.' }
  }

  if ((await countActiveSuperAdminsExcluding(id)) === 0) {
    return { ok: false, error: 'لا يمكن حذف آخر مدير نظام فعّال في النظام.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('soft_delete', { _entity: 'profiles', _id: id } as never)
  if (error) return { ok: false, error: `تعذّر حذف المستخدم: ${error.message}` }

  revalidatePath('/users')
  return { ok: true, message: 'تم حذف المستخدم.' }
}

/** حفظ تجاوزات صلاحيات مستخدم (للمستخدم المخصص أو أي استثناء فردي). */
export async function saveUserPermissionsAction(
  userId: string,
  granted: string[],
  revoked: string[],
): Promise<ActionResult> {
  const guard = await checkPermission('users', 'update')
  if (!guard.ok) return { ok: false, error: guard.error }

  const supabase = await createClient()

  const { error: clearError } = await supabase
    .from('user_permissions').delete().eq('user_id', userId)
  if (clearError) return { ok: false, error: `تعذّر تحديث الصلاحيات: ${clearError.message}` }

  const rows = [
    ...granted.map((permission_id) => ({ user_id: userId, permission_id, granted: true })),
    ...revoked.map((permission_id) => ({ user_id: userId, permission_id, granted: false })),
  ]

  if (rows.length > 0) {
    const { error } = await supabase.from('user_permissions').insert(rows)
    if (error) return { ok: false, error: `تعذّر حفظ الصلاحيات: ${error.message}` }
  }

  await logAudit({
    action: 'permission_change',
    entity: 'profiles',
    entityId: userId,
    summary: `تعديل الصلاحيات الفردية (${granted.length} ممنوحة، ${revoked.length} مسحوبة)`,
  })

  revalidatePath(`/users/${userId}`)
  return { ok: true, message: 'تم حفظ الصلاحيات بنجاح.' }
}

/** تعديل صلاحيات دور كامل. */
export async function saveRolePermissionsAction(
  roleId: string,
  permissionIds: string[],
): Promise<ActionResult> {
  const guard = await checkPermission('users', 'update')
  if (!guard.ok) return { ok: false, error: guard.error }

  const supabase = await createClient()

  const { data: role } = await supabase
    .from('roles').select('code, name_ar, is_system').eq('id', roleId).maybeSingle()

  if (role?.code === 'super_admin') {
    return { ok: false, error: 'لا يمكن تعديل صلاحيات مدير النظام — يجب أن تبقى كاملة.' }
  }

  const { error: clearError } = await supabase
    .from('role_permissions').delete().eq('role_id', roleId)
  if (clearError) return { ok: false, error: `تعذّر تحديث صلاحيات الدور: ${clearError.message}` }

  if (permissionIds.length > 0) {
    const { error } = await supabase
      .from('role_permissions')
      .insert(permissionIds.map((permission_id) => ({ role_id: roleId, permission_id })))
    if (error) return { ok: false, error: `تعذّر حفظ صلاحيات الدور: ${error.message}` }
  }

  await logAudit({
    action: 'permission_change',
    entity: 'roles',
    entityId: roleId,
    entityLabel: role?.name_ar ?? null,
    summary: `تعديل صلاحيات الدور (${permissionIds.length} صلاحية)`,
  })

  revalidatePath('/users/roles')
  return { ok: true, message: 'تم حفظ صلاحيات الدور بنجاح.' }
}

/** تعديل المستخدم لبياناته الشخصية. */
export async function updateMyProfileAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'انتهت الجلسة. يرجى تسجيل الدخول مجددًا.' }

  const parsed = updateProfileSchema.safeParse({
    fullName: formData.get('fullName'),
    phone: formData.get('phone'),
    jobTitle: formData.get('jobTitle'),
  })

  if (!parsed.success) {
    return {
      ok: false,
      error: 'يرجى تصحيح الحقول المحدّدة.',
      fieldErrors: fieldErrorsOf(parsed.error.issues),
    }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
      job_title: parsed.data.jobTitle || null,
    })
    .eq('id', user.id)

  if (error) return { ok: false, error: `تعذّر حفظ البيانات: ${error.message}` }

  await logAudit({
    action: 'update',
    entity: 'profiles',
    entityId: user.id,
    entityLabel: parsed.data.fullName,
    summary: 'تعديل الملف الشخصي',
  })

  revalidatePath('/profile', 'layout')
  return { ok: true, message: 'تم حفظ بياناتك بنجاح.' }
}
