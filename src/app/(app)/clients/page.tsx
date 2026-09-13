import type { Metadata } from 'next'
import Link from 'next/link'
import { UserPlus, Phone, Mail } from 'lucide-react'
import { requirePermission } from '@/lib/auth/session'
import { listClients, listLawyers, type ClientRow } from '@/modules/clients/queries'
import { PageHeader } from '@/components/shared/page-header'
import { FilterBar } from '@/components/shared/filter-bar'
import { DataTable, type Column } from '@/components/shared/data-table'
import { Pagination } from '@/components/shared/pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ClientRowActions } from '@/modules/clients/components/client-row-actions'
import { formatDate } from '@/lib/utils'
import type { SearchParams } from '@/lib/query'
import {
  CLIENT_TYPES, CLIENT_TYPE_LABELS, CLIENT_STATUSES,
  CLIENT_STATUS_LABELS, CLIENT_STATUS_TONE, labelOf, toneOf,
} from '@/lib/constants/enums'

export const metadata: Metadata = { title: 'العملاء' }

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const user = await requirePermission('clients', 'view')
  const params = await searchParams

  const [{ rows, total, page, pageSize }, lawyers] = await Promise.all([
    listClients(params),
    listLawyers(),
  ])

  const canCreate = user.permissions.can('clients', 'create')
  const canUpdate = user.permissions.can('clients', 'update')
  const canDelete = user.permissions.can('clients', 'delete')

  const columns: Column<ClientRow>[] = [
    {
      key: 'name',
      header: 'العميل',
      cell: (row) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium">{row.name}</span>
          <span className="block text-xs text-muted-foreground tabular">{row.client_no}</span>
        </span>
      ),
    },
    {
      key: 'type',
      header: 'النوع',
      cell: (row) => (
        <Badge variant="outline">{labelOf(CLIENT_TYPE_LABELS, row.client_type)}</Badge>
      ),
    },
    {
      key: 'contact',
      header: 'الاتصال',
      hideBelow: 'md',
      cell: (row) => (
        <span className="block space-y-0.5 text-xs text-muted-foreground">
          {row.phone ? (
            <span className="flex items-center gap-1.5">
              <Phone className="size-3" />
              <span dir="ltr" className="tabular">{row.phone}</span>
            </span>
          ) : null}
          {row.email ? (
            <span className="flex items-center gap-1.5">
              <Mail className="size-3" />
              <span dir="ltr" className="truncate">{row.email}</span>
            </span>
          ) : null}
          {!row.phone && !row.email ? '—' : null}
        </span>
      ),
    },
    {
      key: 'lawyer',
      header: 'المحامي المسؤول',
      hideBelow: 'lg',
      cell: (row) => (
        <span className="text-sm">{row.profiles?.full_name ?? '—'}</span>
      ),
    },
    {
      key: 'opened',
      header: 'تاريخ فتح الملف',
      hideBelow: 'lg',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{formatDate(row.file_opened_at)}</span>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      cell: (row) => (
        <Badge variant={toneOf(CLIENT_STATUS_TONE, row.status)}>
          {labelOf(CLIENT_STATUS_LABELS, row.status)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      cell: (row) => (
        <ClientRowActions
          id={row.id} name={row.name}
          canUpdate={canUpdate} canDelete={canDelete}
        />
      ),
    },
  ]

  return (
    <>
      <PageHeader title="العملاء" description={`${total} عميل مسجّل`}>
        {canCreate ? (
          <Button asChild>
            <Link href="/clients/new">
              <UserPlus className="size-4" />
              عميل جديد
            </Link>
          </Button>
        ) : null}
      </PageHeader>

      <FilterBar
        searchPlaceholder="ابحث بالاسم أو رقم العميل أو الهاتف أو الهوية..."
        filters={[
          {
            name: 'type', label: 'النوع',
            options: CLIENT_TYPES.map((t) => ({ value: t, label: CLIENT_TYPE_LABELS[t] })),
          },
          {
            name: 'status', label: 'الحالة',
            options: CLIENT_STATUSES.map((s) => ({ value: s, label: CLIENT_STATUS_LABELS[s] })),
          },
          {
            name: 'lawyer', label: 'المحامي',
            options: lawyers.map((l) => ({ value: l.id, label: l.full_name })),
          },
        ]}
      />

      <DataTable
        rows={rows} columns={columns}
        rowKey={(row) => row.id}
        rowHref={(row) => `/clients/${row.id}`}
        emptyIcon="Users"
        emptyTitle="لا يوجد عملاء مطابقون"
        emptyDescription="ابدأ بإضافة عميل جديد، ثم افتح له قضية من صفحته."
        emptyAction={
          canCreate ? (
            <Button asChild size="sm">
              <Link href="/clients/new">
                <UserPlus className="size-4" />
                عميل جديد
              </Link>
            </Button>
          ) : null
        }
      />

      <Pagination page={page} pageSize={pageSize} total={total} />
    </>
  )
}
