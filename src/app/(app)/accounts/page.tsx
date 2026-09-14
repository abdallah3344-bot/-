import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { requirePermission } from '@/lib/auth/session'
import { listAccounts, getFinanceSummary } from '@/modules/finance/queries'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { PrintButton } from '@/components/shared/print-button'
import { AccountsView } from '@/modules/finance/components/accounts-view'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/utils'
import { currencySymbol } from '@/lib/constants/currencies'

export const metadata: Metadata = { title: 'الحسابات' }

export default async function AccountsPage() {
  const user = await requirePermission('accounts', 'view')
  const supabase = await createClient()

  const [accounts, summary, settingsRes] = await Promise.all([
    listAccounts(),
    getFinanceSummary(),
    supabase.from('settings').select('currency_code').maybeSingle(),
  ])

  const symbol = currencySymbol(settingsRes.data?.currency_code)

  const withBalances = accounts.map((account) => {
    const movement = summary.byAccount.get(account.id) ?? { in: 0, out: 0 }
    return {
      ...account,
      inflow: movement.in,
      outflow: movement.out,
      balance: Number(account.opening_balance ?? 0) + movement.in - movement.out,
    }
  })

  return (
    <>
      <PageHeader title="الحسابات" description="الصندوق والحسابات البنكية وملخّص حركة المكتب">
        <PrintButton />
        <Button variant="outline" asChild>
          <Link href="/accounts/statement">
            <FileText className="size-4" />
            كشف حساب عميل
          </Link>
        </Button>
      </PageHeader>

      <section className="mb-6 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard label="إجمالي الإيرادات" value={formatMoney(summary.income, symbol)}
                  icon="HandCoins" href="/payments" tone="success" />
        <StatCard label="إجمالي المصروفات" value={formatMoney(summary.spent, symbol)}
                  icon="TrendingDown" href="/expenses" tone="danger" />
        <StatCard label="الذمم المدينة" value={formatMoney(summary.receivables, symbol)}
                  icon="Receipt" href="/invoices?status=unpaid"
                  tone={summary.receivables > 0 ? 'warning' : 'default'} />
        <StatCard label="صافي الإيرادات" value={formatMoney(summary.net, symbol)}
                  icon="Wallet" tone="gold" />
      </section>

      <Card className="mb-6">
        <CardHeader><CardTitle>إجمالي الأتعاب المتعاقد عليها</CardTitle></CardHeader>
        <CardContent>
          <p className="text-2xl font-bold tabular">{formatMoney(summary.feesTotal, symbol)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            المحصّل منها {formatMoney(summary.income, symbol)} — المتبقي{' '}
            {formatMoney(Math.max(0, summary.feesTotal - summary.income), symbol)}
          </p>
        </CardContent>
      </Card>

      <AccountsView
        accounts={withBalances}
        canCreate={user.permissions.can('accounts', 'create')}
        canUpdate={user.permissions.can('accounts', 'update')}
        currencySymbol={symbol}
      />
    </>
  )
}
