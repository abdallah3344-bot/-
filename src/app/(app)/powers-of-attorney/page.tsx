import type { Metadata } from 'next'
import { requirePermission } from '@/lib/auth/session'
import { listPoas, getLegalDocOptions, getExpiringCounts } from '@/modules/legal-docs/queries'
import { PageHeader } from '@/components/shared/page-header'
import { FilterBar } from '@/components/shared/filter-bar'
import { Pagination } from '@/components/shared/pagination'
import { StatCard } from '@/components/shared/stat-card'
import { PrintButton } from '@/components/shared/print-button'
import { PoaView } from '@/modules/legal-docs/components/poa-view'
import type { SearchParams } from '@/lib/query'
import { POA_TYPES, POA_TYPE_LABELS, POA_STATUSES, POA_STATUS_LABELS } from '@/lib/constants/enums'

export const metadata: Metadata = { title: 'الوكالات' }

export default async function PoaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const user = await requirePermission('poa', 'view')
  const params = await searchParams

  const [{ rows, total, page, pageSize }, options, counts] = await Promise.all([
    listPoas(params),
    getLegalDocOptions(),
    getExpiringCounts(),
  ])

  return (
    <>
      <PageHeader title="الوكالات" description={`${total} وكالة مسجّلة`}>
        <PrintButton />
      </PageHeader>

      {counts.poaSoon > 0 || counts.poaExpired > 0 ? (
        <section className="mb-5 grid gap-3 grid-cols-2">
          <StatCard label="توشك على الانتهاء (30 يومًا)" value={counts.poaSoon}
                    icon="Bell" href="/powers-of-attorney?status=expiring"
                    tone={counts.poaSoon > 0 ? 'warning' : 'default'} />
          <StatCard label="منتهية ولم تُحدَّث" value={counts.poaExpired}
                    icon="ScrollText" href="/powers-of-attorney?status=expiring"
                    tone={counts.poaExpired > 0 ? 'danger' : 'default'} />
        </section>
      ) : null}

      <FilterBar
        searchPlaceholder="ابحث برقم الوكالة..."
        filters={[
          {
            name: 'status', label: 'الحالة',
            options: [
              { value: 'expiring', label: 'توشك على الانتهاء' },
              ...POA_STATUSES.map((s) => ({ value: s, label: POA_STATUS_LABELS[s] })),
            ],
          },
          {
            name: 'type', label: 'النوع',
            options: POA_TYPES.map((t) => ({ value: t, label: POA_TYPE_LABELS[t] })),
          },
          {
            name: 'client', label: 'العميل',
            options: options.clients.slice(0, 200).map((c) => ({ value: c.id, label: c.name })),
          },
        ]}
      />

      <PoaView
        rows={rows} options={options}
        canCreate={user.permissions.can('poa', 'create')}
        canUpdate={user.permissions.can('poa', 'update')}
        canDelete={user.permissions.can('poa', 'delete')}
      />

      <Pagination page={page} pageSize={pageSize} total={total} />
    </>
  )
}
