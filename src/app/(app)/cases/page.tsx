import type { Metadata } from 'next'
import Link from 'next/link'
import { Briefcase } from 'lucide-react'
import { requirePermission } from '@/lib/auth/session'
import { listCases, getCaseFormOptions, type CaseRow } from '@/modules/cases/queries'
import { PageHeader } from '@/components/shared/page-header'
import { FilterBar } from '@/components/shared/filter-bar'
import { DataTable, type Column } from '@/components/shared/data-table'
import { Pagination } from '@/components/shared/pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CaseRowActions } from '@/modules/cases/components/case-row-actions'
import { formatDate, formatMoney } from '@/lib/utils'
import type { SearchParams } from '@/lib/query'
import {
  CASE_STATUSES, CASE_STATUS_LABELS, CASE_STATUS_TONE,
  PRIORITIES, PRIORITY_LABELS, PRIORITY_TONE, labelOf, toneOf,
} from '@/lib/constants/enums'

export const metadata: Metadata = { title: 'القضايا' }

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const user = await requirePermission('cases', 'view')
  const params = await searchParams

  const [{ rows, total, page, pageSize }, options] = await Promise.all([
    listCases(params),
    getCaseFormOptions(),
  ])

  const canCreate = user.permissions.can('cases', 'create')
  const canUpdate = user.permissions.can('cases', 'update')
  const canDelete = user.permissions.can('cases', 'delete')
  const canClose = user.permissions.can('cases', 'approve')

  const columns: Column<CaseRow>[] = [
    {
      key: 'title',
      header: 'القضية',
      cell: (row) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium">{row.title}</span>
          <span className="block text-xs text-muted-foreground tabular">
            {row.internal_no}
            {row.court_case_no ? ` · محكمة: ${row.court_case_no}` : ''}
          </span>
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
      cell: (row) =>
        row.case_types ? (
          <span className="inline-flex items-center gap-1.5 text-sm">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: row.case_types.color }}
              aria-hidden
            />
            {row.case_types.name_ar}
          </span>
        ) : (
          '—'
        ),
    },
    {
      key: 'court',
      header: 'المحكمة',
      hideBelow: 'lg',
      cell: (row) => <span className="text-sm">{row.courts?.name_ar ?? '—'}</span>,
    },
    {
      key: 'lawyer',
      header: 'المحامي',
      hideBelow: 'lg',
      cell: (row) => <span className="text-sm">{row.responsible?.full_name ?? '—'}</span>,
    },
    {
      key: 'priority',
      header: 'الأولوية',
      hideBelow: 'md',
      cell: (row) => (
        <Badge variant={toneOf(PRIORITY_TONE, row.priority)}>
          {labelOf(PRIORITY_LABELS, row.priority)}
        </Badge>
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
        <CaseRowActions
          id={row.id} title={row.title} status={row.status}
          canUpdate={canUpdate} canDelete={canDelete} canClose={canClose}
        />
      ),
    },
  ]

  return (
    <>
      <PageHeader title="القضايا" description={`${total} قضية`}>
        {canCreate ? (
          <Button asChild>
            <Link href="/cases/new">
              <Briefcase className="size-4" />
              قضية جديدة
            </Link>
          </Button>
        ) : null}
      </PageHeader>

      <FilterBar
        searchPlaceholder="ابحث باسم القضية أو رقم الملف أو رقم المحكمة..."
        filters={[
          {
            name: 'status', label: 'الحالة',
            options: [
              { value: 'open', label: 'المفتوحة فقط' },
              ...CASE_STATUSES.map((s) => ({ value: s, label: CASE_STATUS_LABELS[s] })),
            ],
          },
          {
            name: 'type', label: 'النوع',
            options: options.caseTypes.map((t) => ({ value: t.id, label: t.name_ar })),
          },
          {
            name: 'court', label: 'المحكمة',
            options: options.courts.map((c) => ({ value: c.id, label: c.name_ar })),
          },
          {
            name: 'lawyer', label: 'المحامي',
            options: options.lawyers.map((l) => ({ value: l.id, label: l.full_name })),
          },
          {
            name: 'priority', label: 'الأولوية',
            options: PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] })),
          },
        ]}
      />

      <DataTable
        rows={rows} columns={columns}
        rowKey={(row) => row.id}
        rowHref={(row) => `/cases/${row.id}`}
        emptyIcon="Briefcase"
        emptyTitle="لا توجد قضايا مطابقة"
        emptyDescription="افتح قضية جديدة وابدأ بإضافة الخصوم والجلسات والمستندات."
        emptyAction={
          canCreate ? (
            <Button asChild size="sm">
              <Link href="/cases/new">
                <Briefcase className="size-4" />
                قضية جديدة
              </Link>
            </Button>
          ) : null
        }
      />

      <Pagination page={page} pageSize={pageSize} total={total} />
    </>
  )
}
