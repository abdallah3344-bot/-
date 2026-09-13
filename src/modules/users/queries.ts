import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { DEFAULT_PAGE_SIZE, pageRange, orIlike, type SearchParams, readParam, readPage } from '@/lib/query'

export type UserRow = {
  id: string
  username: string
  full_name: string
  email: string
  phone: string | null
  job_title: string | null
  is_active: boolean
  last_login_at: string | null
  created_at: string
  roles: { code: string; name_ar: string } | null
}

export async function listUsers(params: SearchParams) {
  const supabase = await createClient()
  const page = readPage(params)
  const { from, to } = pageRange(page)

  const term = readParam(params, 'q')
  const role = readParam(params, 'role')
  const status = readParam(params, 'status')

  let query = supabase
    .from('profiles')
    .select('id, username, full_name, email, phone, job_title, is_active, last_login_at, created_at, roles!inner(code, name_ar)',
            { count: 'exact' })
    .is('deleted_at', null)

  if (term) query = query.or(orIlike(['full_name', 'username', 'email', 'phone'], term))
  if (role) query = query.eq('roles.code', role)
  if (status === 'active') query = query.eq('is_active', true)
  if (status === 'inactive') query = query.eq('is_active', false)

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(`تعذّر جلب المستخدمين: ${error.message}`)

  return {
    rows: (data ?? []) as unknown as UserRow[],
    total: count ?? 0,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  }
}

export async function getUser(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, email, phone, job_title, is_active, last_login_at, created_at, avatar_url, role_id, roles(code, name_ar)')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw new Error(`تعذّر جلب المستخدم: ${error.message}`)
  return data as unknown as (UserRow & { role_id: string; avatar_url: string | null }) | null
}

export async function listRoles() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('roles')
    .select('id, code, name_ar, description, is_system')
    .order('created_at')

  if (error) throw new Error(`تعذّر جلب الأدوار: ${error.message}`)
  return data ?? []
}

/** كل الصلاحيات مجمّعة حسب الوحدة — لشاشة إدارة الصلاحيات. */
export async function listPermissions() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('permissions')
    .select('id, code, module, action, label_ar')
    .order('module')

  if (error) throw new Error(`تعذّر جلب الصلاحيات: ${error.message}`)
  return data ?? []
}

/** صلاحيات دور معيّن. */
export async function getRolePermissionIds(roleId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('role_permissions')
    .select('permission_id')
    .eq('role_id', roleId)

  if (error) throw new Error(`تعذّر جلب صلاحيات الدور: ${error.message}`)
  return new Set((data ?? []).map((r) => r.permission_id))
}

/** تجاوزات صلاحيات مستخدم بعينه. */
export async function getUserPermissionOverrides(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_permissions')
    .select('permission_id, granted')
    .eq('user_id', userId)

  if (error) throw new Error(`تعذّر جلب تجاوزات الصلاحيات: ${error.message}`)

  const granted = new Set<string>()
  const revoked = new Set<string>()
  for (const row of data ?? []) {
    if (row.granted) granted.add(row.permission_id)
    else revoked.add(row.permission_id)
  }
  return { granted, revoked }
}

export async function countUsers() {
  const supabase = await createClient()
  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
  return count ?? 0
}
