import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requirePermission } from '@/lib/auth/session'
import {
  getUser, listRoles, listPermissions,
  getRolePermissionIds, getUserPermissionOverrides,
} from '@/modules/users/queries'
import { PageHeader } from '@/components/shared/page-header'
import { UserForm } from '@/modules/users/components/user-form'
import { ResetPasswordCard } from '@/modules/users/components/reset-password-card'
import { UserPermissionsEditor } from '@/modules/users/components/user-permissions-editor'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { formatDate, timeAgo } from '@/lib/utils'

export const metadata: Metadata = { title: 'تعديل مستخدم' }

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const currentUser = await requirePermission('users', 'update')
  const { id } = await params

  const [target, roles, permissions] = await Promise.all([
    getUser(id),
    listRoles(),
    listPermissions(),
  ])

  if (!target) notFound()

  const [rolePermissionIds, overrides] = await Promise.all([
    getRolePermissionIds(target.role_id),
    getUserPermissionOverrides(id),
  ])

  const isSelf = target.id === currentUser.id

  return (
    <>
      <PageHeader title={target.full_name} description={`اسم المستخدم: ${target.username}`}>
        <Badge variant={target.is_active ? 'success' : 'muted'}>
          {target.is_active ? 'مفعّل' : 'معطّل'}
        </Badge>
        <Badge variant="gold">{target.roles?.name_ar ?? '—'}</Badge>
      </PageHeader>

      <p className="mb-5 text-xs text-muted-foreground">
        أُنشئ في {formatDate(target.created_at)}
        {target.last_login_at ? ` · آخر دخول ${timeAgo(target.last_login_at)}` : ' · لم يسجّل دخولًا بعد'}
      </p>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">البيانات الأساسية</TabsTrigger>
          <TabsTrigger value="permissions">الصلاحيات</TabsTrigger>
          <TabsTrigger value="password">كلمة المرور</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="max-w-3xl">
            <UserForm
              roles={roles}
              mode="edit"
              isSelf={isSelf}
              defaults={{
                id: target.id,
                fullName: target.full_name,
                username: target.username,
                email: target.email,
                phone: target.phone,
                jobTitle: target.job_title,
                roleCode: target.roles?.code ?? 'custom',
                isActive: target.is_active,
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="permissions">
          <UserPermissionsEditor
            userId={target.id}
            userName={target.full_name}
            roleName={target.roles?.name_ar ?? '—'}
            permissions={permissions}
            rolePermissionIds={[...rolePermissionIds]}
            grantedIds={[...overrides.granted]}
            revokedIds={[...overrides.revoked]}
          />
        </TabsContent>

        <TabsContent value="password">
          <div className="max-w-xl">
            <ResetPasswordCard userId={target.id} userName={target.full_name} />
          </div>
        </TabsContent>
      </Tabs>
    </>
  )
}
