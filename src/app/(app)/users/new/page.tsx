import type { Metadata } from 'next'
import { requirePermission } from '@/lib/auth/session'
import { listRoles } from '@/modules/users/queries'
import { PageHeader } from '@/components/shared/page-header'
import { UserForm } from '@/modules/users/components/user-form'

export const metadata: Metadata = { title: 'مستخدم جديد' }

export default async function NewUserPage() {
  await requirePermission('users', 'create')
  const roles = await listRoles()

  return (
    <>
      <PageHeader
        title="مستخدم جديد"
        description="أنشئ حسابًا جديدًا وحدّد دوره وصلاحياته"
      />
      <div className="max-w-3xl">
        <UserForm roles={roles} mode="create" />
      </div>
    </>
  )
}
