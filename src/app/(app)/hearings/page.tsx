import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePermission } from '@/lib/auth/session'
import {
  listHearings, getHearingCounts, listOpenCases, resolveRange,
} from '@/modules/hearings/queries'
import { getCaseFormOptions } from '@/modules/cases/queries'
import { PageHeader } from '@/components/shared/page-header'
import { FilterBar } from '@/components/shared/filter-bar'
import { Pagination } from '@/components/shared/pagination'
import { HearingsView } from '@/modules/hearings/components/hearings-view'
import { PrintButton } from '@/components/shared/print-button'
import { cn } from '@/lib/utils'
import type { SearchParams } from '@/lib/query'
import { readParam } from '@/lib/query'
import { HEARING_STATUSES, HEARING_STATUS_LABELS } from '@/lib/constants/enums'

export const metadata: Metadata = { title: 'الجلسات' }

const RANGES = [
  { key: '', label: 'الكل' },
  { key: 'today', label: 'اليوم' },
  { key: 'tomorrow', label: 'الغد' },
  { key: 'week', label: 'هذا الأسبوع' },
  { key: 'month', label: 'هذا الشهر' },
  { key: 'upcoming', label: 'القادمة' },
  { key: 'past', label: 'السابقة' },
] as const

export default async function HearingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const user = await requirePermission('hearings', 'view')
  const params = await searchParams
  const activeRange = readParam(params, 'range') ?? ''

  const [{ rows, total, page, pageSize, rangeLabel }, counts, cases, caseOptions] =
    await Promise.all([
      listHearings(params),
      getHearingCounts(),
      listOpenCases(),
      getCaseFormOptions(),
    ])

  const badge = (key: string) =>
    key === 'today' ? counts.today
    : key === 'tomorrow' ? counts.tomorrow
    : key === 'week' ? counts.week
    : key === 'month' ? counts.month
    : null

  return (
    <>
      <PageHeader title={rangeLabel} description={`${total} جلسة`}>
        <PrintButton />
      </PageHeader>

      {/* نطاقات زمنية سريعة */}
      <div className="mb-4 flex flex-wrap gap-2 no-print">
        {RANGES.map((range) => {
          const isActive = activeRange === range.key
          const count = badge(range.key)
          const href = range.key ? `/hearings?range=${range.key}` : '/hearings'
          return (
            <Link
              key={range.key || 'all'}
              href={href}
              className={cn(
                'flex items-center gap-2 rounded-[var(--radius-app)] border px-3.5 py-2 text-sm transition-colors',
                isActive
                  ? 'border-gold-400 bg-gold-50 font-medium text-navy-900 dark:bg-gold-900/30 dark:text-gold-200'
                  : 'border-border bg-surface hover:bg-surface-muted',
              )}
            >
              {range.label}
              {count !== null && count > 0 ? (
                <span className="rounded-full bg-navy-900 px-1.5 text-[11px] text-white tabular dark:bg-gold-500 dark:text-navy-950">
                  {count}
                </span>
              ) : null}
            </Link>
          )
        })}
      </div>

      <FilterBar
        searchPlaceholder="ابحث في الجلسات..."
        filters={[
          {
            name: 'status', label: 'الحالة',
            options: HEARING_STATUSES.map((s) => ({ value: s, label: HEARING_STATUS_LABELS[s] })),
          },
          {
            name: 'court', label: 'المحكمة',
            options: caseOptions.courts.map((c) => ({ value: c.id, label: c.name_ar })),
          },
          {
            name: 'lawyer', label: 'المحامي',
            options: caseOptions.lawyers.map((l) => ({ value: l.id, label: l.full_name })),
          },
        ]}
      />

      <HearingsView
        rows={rows}
        options={{
          cases,
          courts: caseOptions.courts,
          chambers: caseOptions.chambers,
          judges: caseOptions.judges,
          lawyers: caseOptions.lawyers,
        }}
        canCreate={user.permissions.can('hearings', 'create')}
        canUpdate={user.permissions.can('hearings', 'update')}
        canDelete={user.permissions.can('hearings', 'delete')}
      />

      <Pagination page={page} pageSize={pageSize} total={total} />
    </>
  )
}
