import type { Metadata } from 'next'
import { Suspense } from 'react'
import { requirePermission } from '@/lib/auth/session'
import { listPayments } from '@/modules/finance/queries'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { FilterBar } from '@/components/shared/filter-bar'
import { Pagination } from '@/components/shared/pagination'
import { PaymentsView } from '@/modules/finance/components/payments-view'
import { formatMoney } from '@/lib/utils'
import type { SearchParams } from '@/lib/query'
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '@/lib/constants/enums'

export const metadata: Metadata = { title: 'المقبوضات' }

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const user = await requirePermission('payments', 'view')
  const params = await searchParams
  const supabase = await createClient()

  const [{ rows, total, page, pageSize }, clientsRes, casesRes, invoicesRes, accountsRes, settingsRes] =
    await Promise.all([
      listPayments(params),
      supabase.from('clients').select('id, name').is('deleted_at', null).order('name').limit(1000),
      supabase.from('cases').select('id, title, internal_no').is('deleted_at', null)
        .order('created_at', { ascending: false }).limit(1000),
      supabase.from('invoices').select('id, invoice_no, total, paid_amount')
        .is('deleted_at', null).not('status', 'in', '("paid","cancelled")')
        .order('issue_date', { ascending: false }).limit(500),
      supabase.from('accounts').select('id, name').is('deleted_at', null).eq('is_active', true),
      supabase.from('settings').select('currency_symbol').maybeSingle(),
    ])

  const symbol = settingsRes.data?.currency_symbol ?? 'ر.س'
  const sum = rows.reduce((s, r) => s + Number(r.amount ?? 0), 0)

  return (
    <>
      <PageHeader
        title="المقبوضات"
        description={`${total} إيصال — مجموع الصفحة الحالية ${formatMoney(sum, symbol)}`}
      />

      <FilterBar
        searchPlaceholder="ابحث برقم الإيصال أو المرجع..."
        filters={[
          {
            name: 'method', label: 'طريقة الدفع',
            options: PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] })),
          },
          {
            name: 'client', label: 'العميل',
            options: (clientsRes.data ?? []).slice(0, 200).map((c) => ({ value: c.id, label: c.name })),
          },
        ]}
      />

      <Suspense fallback={null}>
        <PaymentsView
          rows={rows}
          options={{
            clients: clientsRes.data ?? [],
            cases: casesRes.data ?? [],
            invoices: (invoicesRes.data ?? []) as never,
            accounts: accountsRes.data ?? [],
          }}
          canCreate={user.permissions.can('payments', 'create')}
          canUpdate={user.permissions.can('payments', 'update')}
          canDelete={user.permissions.can('payments', 'delete')}
          canPrint={user.permissions.can('payments', 'print')}
          currencySymbol={symbol}
        />
      </Suspense>

      <Pagination page={page} pageSize={pageSize} total={total} />
    </>
  )
}
