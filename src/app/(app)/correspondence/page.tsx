import type { Metadata } from 'next'
import { requirePermission } from '@/lib/auth/session'
import { listCorrespondence, getCorrespondenceCounts } from '@/modules/correspondence/queries'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { FilterBar } from '@/components/shared/filter-bar'
import { Pagination } from '@/components/shared/pagination'
import { StatCard } from '@/components/shared/stat-card'
import { PrintButton } from '@/components/shared/print-button'
import { CorrespondenceView } from '@/modules/correspondence/components/correspondence-view'
import type { SearchParams } from '@/lib/query'
import {
  CORR_DIRECTIONS, CORR_DIRECTION_LABELS, CORR_PARTY_TYPES,
  CORR_PARTY_LABELS, CORR_STATUSES, CORR_STATUS_LABELS,
} from '@/lib/constants/enums'

export const metadata: Metadata = { title: 'المراسلات' }

export default async function CorrespondencePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const user = await requirePermission('correspondence', 'view')
  const params = await searchParams
  const supabase = await createClient()

  const [{ rows, total, page, pageSize }, counts, clientsRes, casesRes, staffRes, docsRes] =
    await Promise.all([
      listCorrespondence(params),
      getCorrespondenceCounts(),
      supabase.from('clients').select('id, name').is('deleted_at', null).order('name').limit(1000),
      supabase.from('cases').select('id, title, internal_no').is('deleted_at', null)
        .order('created_at', { ascending: false }).limit(1000),
      supabase.from('profiles').select('id, full_name')
        .eq('is_active', true).is('deleted_at', null).order('full_name'),
      supabase.from('documents').select('id, name').is('deleted_at', null)
        .order('created_at', { ascending: false }).limit(500),
    ])

  return (
    <>
      <PageHeader title="المراسلات" description={`${total} مراسلة مسجّلة`}>
        <PrintButton />
      </PageHeader>

      <section className="mb-5 grid gap-3 grid-cols-3">
        <StatCard label="الصادر" value={counts.outgoing} icon="Mails"
                  href="/correspondence?direction=outgoing" />
        <StatCard label="الوارد" value={counts.incoming} icon="Mails"
                  href="/correspondence?direction=incoming" tone="success" />
        <StatCard label="قيد المعالجة" value={counts.open} icon="Bell"
                  href="/correspondence?status=open"
                  tone={counts.open > 0 ? 'warning' : 'default'} />
      </section>

      <FilterBar
        searchPlaceholder="ابحث بالموضوع أو الجهة أو الرقم المرجعي..."
        filters={[
          {
            name: 'direction', label: 'النوع',
            options: CORR_DIRECTIONS.map((d) => ({ value: d, label: CORR_DIRECTION_LABELS[d] })),
          },
          {
            name: 'party', label: 'الجهة',
            options: CORR_PARTY_TYPES.map((p) => ({ value: p, label: CORR_PARTY_LABELS[p] })),
          },
          {
            name: 'status', label: 'الحالة',
            options: CORR_STATUSES.map((s) => ({ value: s, label: CORR_STATUS_LABELS[s] })),
          },
        ]}
      />

      <CorrespondenceView
        rows={rows}
        options={{
          clients: clientsRes.data ?? [],
          cases: casesRes.data ?? [],
          staff: staffRes.data ?? [],
          documents: docsRes.data ?? [],
        }}
        canCreate={user.permissions.can('correspondence', 'create')}
        canUpdate={user.permissions.can('correspondence', 'update')}
        canDelete={user.permissions.can('correspondence', 'delete')}
      />

      <Pagination page={page} pageSize={pageSize} total={total} />
    </>
  )
}
