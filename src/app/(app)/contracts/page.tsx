import type { Metadata } from 'next'
import { requirePermission } from '@/lib/auth/session'
import { listContracts, getLegalDocOptions, getExpiringCounts } from '@/modules/legal-docs/queries'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { FilterBar } from '@/components/shared/filter-bar'
import { Pagination } from '@/components/shared/pagination'
import { StatCard } from '@/components/shared/stat-card'
import { PrintButton } from '@/components/shared/print-button'
import { ContractsView } from '@/modules/legal-docs/components/contracts-view'
import type { SearchParams } from '@/lib/query'
import { CONTRACT_STATUSES, CONTRACT_STATUS_LABELS } from '@/lib/constants/enums'
import { currencySymbol } from '@/lib/constants/currencies'

export const metadata: Metadata = { title: 'العقود' }

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const user = await requirePermission('contracts', 'view')
  const params = await searchParams
  const supabase = await createClient()

  const [{ rows, total, page, pageSize }, options, counts, settingsRes] = await Promise.all([
    listContracts(params),
    getLegalDocOptions(),
    getExpiringCounts(),
    supabase.from('settings').select('currency_code').maybeSingle(),
  ])

  const symbol = currencySymbol(settingsRes.data?.currency_code)

  return (
    <>
      <PageHeader title="العقود" description={`${total} عقد مسجّل`}>
        <PrintButton />
      </PageHeader>

      {counts.contractSoon > 0 || counts.contractExpired > 0 ? (
        <section className="mb-5 grid gap-3 grid-cols-2">
          <StatCard label="توشك على الانتهاء (30 يومًا)" value={counts.contractSoon}
                    icon="Bell" href="/contracts?status=expiring"
                    tone={counts.contractSoon > 0 ? 'warning' : 'default'} />
          <StatCard label="منتهية ولم تُحدَّث" value={counts.contractExpired}
                    icon="FileSignature" href="/contracts?status=expiring"
                    tone={counts.contractExpired > 0 ? 'danger' : 'default'} />
        </section>
      ) : null}

      <FilterBar
        searchPlaceholder="ابحث باسم العقد أو رقمه أو الطرف الآخر..."
        filters={[
          {
            name: 'status', label: 'الحالة',
            options: [
              { value: 'expiring', label: 'توشك على الانتهاء' },
              ...CONTRACT_STATUSES.map((s) => ({ value: s, label: CONTRACT_STATUS_LABELS[s] })),
            ],
          },
          {
            name: 'client', label: 'العميل',
            options: options.clients.slice(0, 200).map((c) => ({ value: c.id, label: c.name })),
          },
        ]}
      />

      <ContractsView
        rows={rows} options={options} currencySymbol={symbol}
        canCreate={user.permissions.can('contracts', 'create')}
        canUpdate={user.permissions.can('contracts', 'update')}
        canDelete={user.permissions.can('contracts', 'delete')}
      />

      <Pagination page={page} pageSize={pageSize} total={total} />
    </>
  )
}
