import type { Metadata } from 'next'
import Link from 'next/link'
import { Receipt } from 'lucide-react'
import { requirePermission } from '@/lib/auth/session'
import { listInvoices, getFinanceSummary, type InvoiceRow } from '@/modules/finance/queries'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { FilterBar } from '@/components/shared/filter-bar'
import { DataTable, type Column } from '@/components/shared/data-table'
import { Pagination } from '@/components/shared/pagination'
import { StatCard } from '@/components/shared/stat-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InvoiceRowActions } from '@/modules/finance/components/invoice-row-actions'
import { formatDate, formatMoney } from '@/lib/utils'
import type { SearchParams } from '@/lib/query'
import { INVOICE_STATUSES, INVOICE_STATUS_LABELS, INVOICE_STATUS_TONE, labelOf, toneOf }
  from '@/lib/constants/enums'

export const metadata: Metadata = { title: 'الفواتير' }

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const user = await requirePermission('invoices', 'view')
  const params = await searchParams
  const supabase = await createClient()

  const [{ rows, total, page, pageSize }, summary, clientsRes, settingsRes] = await Promise.all([
    listInvoices(params),
    getFinanceSummary(),
    supabase.from('clients').select('id, name').is('deleted_at', null).order('name').limit(500),
    supabase.from('settings').select('currency_symbol').maybeSingle(),
  ])

  const symbol = settingsRes.data?.currency_symbol ?? 'ر.س'
  const canCreate = user.permissions.can('invoices', 'create')

  const columns: Column<InvoiceRow>[] = [
    {
      key: 'no',
      header: 'رقم الفاتورة',
      cell: (row) => (
        <span className="block">
          <span className="block font-medium tabular">{row.invoice_no}</span>
          <span className="block text-xs text-muted-foreground">
            {formatDate(row.issue_date)}
          </span>
        </span>
      ),
    },
    {
      key: 'client',
      header: 'العميل',
      cell: (row) =>
        row.clients ? (
          <Link href={`/clients/${row.clients.id}`} className="text-sm hover:text-gold-600">
            {row.clients.name}
          </Link>
        ) : '—',
    },
    {
      key: 'case',
      header: 'القضية',
      hideBelow: 'lg',
      cell: (row) =>
        row.cases ? (
          <Link href={`/cases/${row.cases.id}`}
                className="block max-w-40 truncate text-sm hover:text-gold-600">
            {row.cases.title}
          </Link>
        ) : <span className="text-xs text-muted-foreground">—</span>,
    },
    {
      key: 'total',
      header: 'الإجمالي',
      align: 'end',
      cell: (row) => (
        <span className="text-sm font-medium tabular">{formatMoney(row.total, symbol)}</span>
      ),
    },
    {
      key: 'paid',
      header: 'المدفوع',
      align: 'end',
      hideBelow: 'md',
      cell: (row) => (
        <span className="text-sm tabular text-emerald-700 dark:text-emerald-400">
          {formatMoney(row.paid_amount, symbol)}
        </span>
      ),
    },
    {
      key: 'remaining',
      header: 'المتبقي',
      align: 'end',
      hideBelow: 'md',
      cell: (row) => {
        const remaining = Number(row.total) - Number(row.paid_amount)
        return (
          <span className={`text-sm font-medium tabular ${remaining > 0 ? 'text-danger' : ''}`}>
            {formatMoney(remaining, symbol)}
          </span>
        )
      },
    },
    {
      key: 'status',
      header: 'الحالة',
      cell: (row) => (
        <Badge variant={toneOf(INVOICE_STATUS_TONE, row.status)}>
          {labelOf(INVOICE_STATUS_LABELS, row.status)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      cell: (row) => (
        <InvoiceRowActions
          id={row.id} invoiceNo={row.invoice_no}
          canUpdate={user.permissions.can('invoices', 'update')}
          canDelete={user.permissions.can('invoices', 'delete')}
        />
      ),
    },
  ]

  return (
    <>
      <PageHeader title="الفواتير" description={`${total} فاتورة`}>
        {canCreate ? (
          <Button asChild>
            <Link href="/invoices/new">
              <Receipt className="size-4" />
              فاتورة جديدة
            </Link>
          </Button>
        ) : null}
      </PageHeader>

      <section className="mb-5 grid gap-3 grid-cols-2 lg:grid-cols-3">
        <StatCard label="إجمالي المقبوضات" value={formatMoney(summary.income, symbol)}
                  icon="HandCoins" href="/payments" tone="success" />
        <StatCard label="المستحقات غير المحصّلة" value={formatMoney(summary.receivables, symbol)}
                  icon="Receipt" href="/invoices?status=unpaid"
                  tone={summary.receivables > 0 ? 'warning' : 'default'} />
        <StatCard label="صافي الإيرادات" value={formatMoney(summary.net, symbol)}
                  icon="Wallet" href="/accounts" tone="gold" />
      </section>

      <FilterBar
        searchPlaceholder="ابحث برقم الفاتورة..."
        filters={[
          {
            name: 'status', label: 'الحالة',
            options: [
              { value: 'unpaid', label: 'غير مسدّدة' },
              ...INVOICE_STATUSES.map((s) => ({ value: s, label: INVOICE_STATUS_LABELS[s] })),
            ],
          },
          {
            name: 'client', label: 'العميل',
            options: (clientsRes.data ?? []).map((c) => ({ value: c.id, label: c.name })),
          },
        ]}
      />

      <DataTable
        rows={rows} columns={columns} rowKey={(row) => row.id}
        rowHref={(row) => `/invoices/${row.id}`}
        emptyIcon="Receipt"
        emptyTitle="لا توجد فواتير"
        emptyDescription="أصدر فاتورة للعميل وسجّل عليها الدفعات لتتبّع المستحقات."
        emptyAction={
          canCreate ? (
            <Button asChild size="sm">
              <Link href="/invoices/new">
                <Receipt className="size-4" />
                فاتورة جديدة
              </Link>
            </Button>
          ) : null
        }
      />

      <Pagination page={page} pageSize={pageSize} total={total} />
    </>
  )
}
