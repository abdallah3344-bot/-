import type { Metadata } from 'next'
import { requirePermission } from '@/lib/auth/session'
import { listCaseFees, getPaidByCaseMap } from '@/modules/finance/queries'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { Pagination } from '@/components/shared/pagination'
import { FeesView } from '@/modules/finance/components/fees-view'
import { formatMoney } from '@/lib/utils'
import type { SearchParams } from '@/lib/query'
import { currencySymbol } from '@/lib/constants/currencies'

export const metadata: Metadata = { title: 'أتعاب المحاماة' }

export default async function FeesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const user = await requirePermission('fees', 'view')
  const params = await searchParams
  const supabase = await createClient()

  const [{ rows, total, page, pageSize }, casesRes, settingsRes] = await Promise.all([
    listCaseFees(params),
    supabase.from('cases').select('id, title, internal_no').is('deleted_at', null)
      .not('status', 'in', '("archived")')
      .order('created_at', { ascending: false }).limit(1000),
    supabase.from('settings').select('currency_code').maybeSingle(),
  ])

  const paidMap = await getPaidByCaseMap(rows.map((r) => r.case_id))
  const paidByCase = Object.fromEntries(paidMap)
  const symbol = currencySymbol(settingsRes.data?.currency_code)

  const totalFees = rows.reduce((s, r) => s + Number(r.total_amount ?? 0), 0)

  return (
    <>
      <PageHeader
        title="أتعاب المحاماة"
        description={`${total} قضية بأتعاب محدّدة — إجمالي الصفحة ${formatMoney(totalFees, symbol)}`}
      />

      <FeesView
        rows={rows}
        paidByCase={paidByCase}
        cases={casesRes.data ?? []}
        canCreate={user.permissions.can('fees', 'create')}
        canUpdate={user.permissions.can('fees', 'update')}
        currencySymbol={symbol}
      />

      <Pagination page={page} pageSize={pageSize} total={total} />
    </>
  )
}
