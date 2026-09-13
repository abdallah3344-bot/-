import type { Metadata } from 'next'
import { requirePermission } from '@/lib/auth/session'
import { listRoles, listPermissions } from '@/modules/users/queries'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { RolePermissionsEditor } from '@/modules/users/components/role-permissions-editor'

export const metadata: Metadata = { title: 'صلاحيات الأدوار' }

export default async function RolesPage() {
  await requirePermission('users', 'update')

  const [roles, permissions] = await Promise.all([listRoles(), listPermissions()])

  const supabase = await createClient()
  const { data: rolePerms } = await supabase
    .from('role_permissions')
    .select('role_id, permission_id')

  const byRole: Record<string, string[]> = {}
  for (const row of rolePerms ?? []) {
    ;(byRole[row.role_id] ??= []).push(row.permission_id)
  }

  return (
    <>
      <PageHeader
        title="صلاحيات الأدوار"
        description="حدّد ما يستطيع كل دور فعله. التعديل هنا ينعكس فورًا على كل المستخدمين الذين يحملون الدور."
      />
      <RolePermissionsEditor
        roles={roles}
        permissions={permissions}
        rolePermissions={byRole}
      />
    </>
  )
}
