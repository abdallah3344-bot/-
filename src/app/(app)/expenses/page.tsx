import type { Metadata } from 'next'
import { requirePermission } from '@/lib/auth/session'
import { listExpenses } from '@/modules/finance/queries'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { FilterBar } from '@/components/shared/filter-bar'
import { Pagination } from '@/components/shared/pagination'
import { ExpensesView } from '@/modules/finance/components/expenses-view'
import { formatMoney } from '@/lib/utils'
import type { SearchParams } from '@/lib/query'

export const metadata: Metadata = { title: 'المصروفات' }

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const user = await requirePermission('expenses', 'view')
  const params = await searchParams
  const supabase = await createClient()

  const [{ rows, total, page, pageSize }, categoriesRes, casesRes, clientsRes, accountsRes, settingsRes] =
    await Promise.all([
      listExpenses(params),
      supabase.from('expense_categories').select('id, name_ar').eq('is_active', true).order('sort_order'),
      supabase.from('cases').select('id, title, internal_no').is('deleted_at', null)
        .order('created_at', { ascending: false }).limit(1000),
      supabase.from('clients').select('id, name').is('deleted_at', null).order('name').limit(1000),
      supabase.from('accounts').select('id, name').is('deleted_at', null).eq('is_active', true),
      supabase.from('settings').select('currency_symbol').maybeSingle(),
    ])

  const symbol = settingsRes.data?.currency_symbol ?? 'ر.س'
  const sum = rows.reduce((s, r) => s + Number(r.amount ?? 0), 0)

  return (
    <>
      <PageHeader
        title="المصروفات"
        description={`${total} مصروف — مجموع الصفحة الحالية ${formatMoney(sum, symbol)}`}
      />

      <FilterBar
        searchPlaceholder="ابحث في البيان أو رقم السند..."
        filters={[
          {
            name: 'category', label: 'النوع',
            options: (categoriesRes.data ?? []).map((c) => ({ value: c.id, label: c.name_ar })),
          },
        ]}
      />

      <ExpensesView
        rows={rows}
        options={{
          categories: categoriesRes.data ?? [],
          cases: casesRes.data ?? [],
          clients: clientsRes.data ?? [],
          accounts: accountsRes.data ?? [],
        }}
        canCreate={user.permissions.can('expenses', 'create')}
        canUpdate={user.permissions.can('expenses', 'update')}
        canDelete={user.permissions.can('expenses', 'delete')}
        currencySymbol={symbol}
      />

      <Pagination page={page} pageSize={pageSize} total={total} />
    </>
  )
}
