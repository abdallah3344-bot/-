import type { Metadata } from 'next'
import Link from 'next/link'
import { UserPlus, ShieldCheck } from 'lucide-react'
import { requirePermission } from '@/lib/auth/session'
import { listUsers, listRoles } from '@/modules/users/queries'
import { PageHeader } from '@/components/shared/page-header'
import { FilterBar } from '@/components/shared/filter-bar'
import { DataTable, type Column } from '@/components/shared/data-table'
import { Pagination } from '@/components/shared/pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UserRowActions } from '@/modules/users/components/user-row-actions'
import { timeAgo, initials } from '@/lib/utils'
import type { SearchParams } from '@/lib/query'
import type { UserRow } from '@/modules/users/queries'

export const metadata: Metadata = { title: 'المستخدمون والصلاحيات' }

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const user = await requirePermission('users', 'view')
  const params = await searchParams

  const [{ rows, total, page, pageSize }, roles] = await Promise.all([
    listUsers(params),
    listRoles(),
  ])

  const canCreate = user.permissions.can('users', 'create')
  const canUpdate = user.permissions.can('users', 'update')
  const canDelete = user.permissions.can('users', 'delete')

  const columns: Column<UserRow>[] = [
    {
      key: 'name',
      header: 'المستخدم',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-navy-100 text-xs font-semibold text-navy-800 dark:bg-navy-800 dark:text-navy-200">
            {initials(row.full_name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{row.full_name}</span>
            <span className="block truncate text-xs text-muted-foreground" dir="ltr">
              {row.username}
            </span>
          </span>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'الدور',
      cell: (row) => <Badge variant="gold">{row.roles?.name_ar ?? '—'}</Badge>,
    },
    {
      key: 'email',
      header: 'البريد الإلكتروني',
      hideBelow: 'md',
      cell: (row) => (
        <span className="text-sm text-muted-foreground" dir="ltr">{row.email}</span>
      ),
    },
    {
      key: 'phone',
      header: 'الهاتف',
      hideBelow: 'lg',
      cell: (row) => (
        <span className="text-sm text-muted-foreground tabular" dir="ltr">
          {row.phone || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      cell: (row) => (
        <Badge variant={row.is_active ? 'success' : 'muted'}>
          {row.is_active ? 'مفعّل' : 'معطّل'}
        </Badge>
      ),
    },
    {
      key: 'last_login',
      header: 'آخر دخول',
      hideBelow: 'lg',
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.last_login_at ? timeAgo(row.last_login_at) : 'لم يسجّل دخولًا بعد'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      cell: (row) => (
        <UserRowActions
          id={row.id}
          name={row.full_name}
          isSelf={row.id === user.id}
          canUpdate={canUpdate}
          canDelete={canDelete}
        />
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="المستخدمون والصلاحيات"
        description={`${total} مستخدم مسجّل في النظام`}
      >
        {canUpdate ? (
          <Button variant="outline" asChild>
            <Link href="/users/roles">
              <ShieldCheck className="size-4" />
              صلاحيات الأدوار
            </Link>
          </Button>
        ) : null}
        {canCreate ? (
          <Button asChild>
            <Link href="/users/new">
              <UserPlus className="size-4" />
              مستخدم جديد
            </Link>
          </Button>
        ) : null}
      </PageHeader>

      <FilterBar
        searchPlaceholder="ابحث بالاسم أو اسم المستخدم أو البريد..."
        filters={[
          {
            name: 'role',
            label: 'الدور',
            options: roles.map((r) => ({ value: r.code, label: r.name_ar })),
          },
          {
            name: 'status',
            label: 'الحالة',
            options: [
              { value: 'active', label: 'مفعّل' },
              { value: 'inactive', label: 'معطّل' },
            ],
          },
        ]}
      />

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        rowHref={canUpdate ? (row) => `/users/${row.id}` : undefined}
        emptyIcon="ShieldCheck"
        emptyTitle="لا يوجد مستخدمون مطابقون"
        emptyDescription="جرّب تعديل البحث أو التصفية، أو أضف مستخدمًا جديدًا."
        emptyAction={
          canCreate ? (
            <Button asChild size="sm">
              <Link href="/users/new">
                <UserPlus className="size-4" />
                مستخدم جديد
              </Link>
            </Button>
          ) : null
        }
      />

      <Pagination page={page} pageSize={pageSize} total={total} />
    </>
  )
}
