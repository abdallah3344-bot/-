import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePermission } from '@/lib/auth/session'
import { listCases, getCaseFormOptions, type CaseRow } from '@/modules/cases/queries'
import { PageHeader } from '@/components/shared/page-header'
import { FilterBar } from '@/components/shared/filter-bar'
import { DataTable, type Column } from '@/components/shared/data-table'
import { Pagination } from '@/components/shared/pagination'
import { PrintButton } from '@/components/shared/print-button'
import { Badge } from '@/components/ui/badge'
import { ArchiveRowActions } from '@/modules/cases/components/archive-row-actions'
import { formatDate } from '@/lib/utils'
import type { SearchParams } from '@/lib/query'
import { CASE_STATUS_LABELS, CASE_STATUS_TONE, labelOf, toneOf } from '@/lib/constants/enums'

export const metadata: Metadata = { title: 'الأرشيف' }

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const user = await requirePermission('archive', 'view')
  const params = await searchParams

  const [{ rows, total, page, pageSize }, options] = await Promise.all([
    listCases(params, { archived: true }),
    getCaseFormOptions(),
  ])

  const canReopen = user.permissions.can('archive', 'approve')

  const columns: Column<CaseRow>[] = [
    {
      key: 'title',
      header: 'القضية',
      cell: (row) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium">{row.title}</span>
          <span className="block text-xs text-muted-foreground tabular">{row.internal_no}</span>
        </span>
      ),
    },
    {
      key: 'client',
      header: 'العميل',
      hideBelow: 'sm',
      cell: (row) => <span className="text-sm">{row.clients?.name ?? '—'}</span>,
    },
    {
      key: 'type',
      header: 'النوع',
      hideBelow: 'md',
      cell: (row) => <span className="text-sm">{row.case_types?.name_ar ?? '—'}</span>,
    },
    {
      key: 'court',
      header: 'المحكمة',
      hideBelow: 'lg',
      cell: (row) => <span className="text-sm">{row.courts?.name_ar ?? '—'}</span>,
    },
    {
      key: 'registered',
      header: 'تاريخ التسجيل',
      hideBelow: 'lg',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{formatDate(row.registered_at)}</span>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      cell: (row) => (
        <Badge variant={toneOf(CASE_STATUS_TONE, row.status)}>
          {labelOf(CASE_STATUS_LABELS, row.status)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      cell: (row) => (
        <ArchiveRowActions id={row.id} title={row.title} canReopen={canReopen} />
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="الأرشيف"
        description={`${total} قضية مغلقة — تحتفظ بكل مستنداتها وحركاتها المالية وتاريخ الإغلاق`}
      >
        <PrintButton />
      </PageHeader>

      <FilterBar
        searchPlaceholder="ابحث في القضايا المؤرشفة..."
        filters={[
          {
            name: 'type', label: 'النوع',
            options: options.caseTypes.map((t) => ({ value: t.id, label: t.name_ar })),
          },
          {
            name: 'court', label: 'المحكمة',
            options: options.courts.map((c) => ({ value: c.id, label: c.name_ar })),
          },
        ]}
      />

      <DataTable
        rows={rows} columns={columns} rowKey={(row) => row.id}
        rowHref={(row) => `/cases/${row.id}`}
        emptyIcon="Archive"
        emptyTitle="الأرشيف فارغ"
        emptyDescription="القضايا المغلقة تنتقل إلى هنا تلقائيًا مع الاحتفاظ بكل بياناتها."
      />

      <Pagination page={page} pageSize={pageSize} total={total} />
    </>
  )
}
