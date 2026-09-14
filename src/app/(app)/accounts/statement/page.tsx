import type { Metadata } from 'next'
import { requirePermission } from '@/lib/auth/session'
import { getClientStatement } from '@/modules/finance/queries'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { PrintButton } from '@/components/shared/print-button'
import { EmptyState } from '@/components/shared/empty-state'
import { StatementPicker } from '@/modules/finance/components/statement-picker'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate, formatMoney } from '@/lib/utils'
import { readParam, type SearchParams } from '@/lib/query'
import { currencySymbol } from '@/lib/constants/currencies'

export const metadata: Metadata = { title: 'كشف حساب عميل' }

const KIND_LABELS: Record<string, string> = {
  invoice: 'فاتورة',
  payment: 'دفعة',
  expense: 'مصروف',
}

export default async function StatementPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await requirePermission('accounts', 'view')
  const params = await searchParams
  const clientId = readParam(params, 'client')

  const supabase = await createClient()
  const [clientsRes, settingsRes] = await Promise.all([
    supabase.from('clients').select('id, name, client_no').is('deleted_at', null)
      .order('name').limit(1000),
    supabase.from('settings').select('currency_code, office_name').maybeSingle(),
  ])

  const symbol = currencySymbol(settingsRes.data?.currency_code)
  const statement = clientId ? await getClientStatement(clientId) : null

  return (
    <>
      <PageHeader
        title="كشف حساب عميل"
        description="كل الفواتير والمصروفات القابلة للتحصيل والدفعات مرتبة زمنيًا برصيد جارٍ"
      >
        {statement ? <PrintButton label="طباعة الكشف" /> : null}
      </PageHeader>

      <div className="mb-5 no-print">
        <StatementPicker clients={clientsRes.data ?? []} selected={clientId ?? null} />
      </div>

      {!statement ? (
        <EmptyState icon="Users" title="اختر عميلًا"
                    description="اختر عميلًا من القائمة أعلاه لعرض كشف حسابه." />
      ) : statement.lines.length === 0 ? (
        <EmptyState icon="FileText" title="لا توجد حركات"
                    description="هذا العميل ليس عليه فواتير أو مصروفات أو دفعات بعد." />
      ) : (
        <Card className="print-sheet">
          <CardContent className="pt-5">
            <header className="mb-5 border-b border-border pb-4">
              <h2 className="text-lg font-bold">
                {settingsRes.data?.office_name ?? 'مكتب المحاماة'}
              </h2>
              <p className="mt-1 text-sm">
                كشف حساب: <strong>{statement.client?.name}</strong>
                {statement.client?.client_no ? (
                  <span className="text-muted-foreground tabular">
                    {' '}({statement.client.client_no})
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground">
                تاريخ الإصدار: {formatDate(new Date())}
              </p>
            </header>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border bg-surface-muted">
                    <th className="p-2.5 text-start text-xs font-semibold">التاريخ</th>
                    <th className="p-2.5 text-start text-xs font-semibold">النوع</th>
                    <th className="p-2.5 text-start text-xs font-semibold">المرجع</th>
                    <th className="p-2.5 text-start text-xs font-semibold">البيان</th>
                    <th className="p-2.5 text-end text-xs font-semibold">مدين</th>
                    <th className="p-2.5 text-end text-xs font-semibold">دائن</th>
                    <th className="p-2.5 text-end text-xs font-semibold">الرصيد</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.lines.map((line, index) => (
                    <tr key={index} className="border-b border-border">
                      <td className="p-2.5 tabular whitespace-nowrap">{formatDate(line.date)}</td>
                      <td className="p-2.5">{KIND_LABELS[line.kind] ?? line.kind}</td>
                      <td className="p-2.5 tabular text-muted-foreground">{line.reference}</td>
                      <td className="p-2.5">{line.description}</td>
                      <td className="p-2.5 text-end tabular">
                        {line.debit > 0 ? formatMoney(line.debit, symbol) : '—'}
                      </td>
                      <td className="p-2.5 text-end tabular text-emerald-700 dark:text-emerald-400">
                        {line.credit > 0 ? formatMoney(line.credit, symbol) : '—'}
                      </td>
                      <td className="p-2.5 text-end font-medium tabular">
                        {formatMoney(line.balance, symbol)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border font-bold">
                    <td className="p-2.5" colSpan={4}>الإجمالي</td>
                    <td className="p-2.5 text-end tabular">
                      {formatMoney(statement.totals.debit, symbol)}
                    </td>
                    <td className="p-2.5 text-end tabular">
                      {formatMoney(statement.totals.credit, symbol)}
                    </td>
                    <td className="p-2.5 text-end tabular">
                      {formatMoney(statement.totals.balance, symbol)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <p className="mt-5 rounded-lg bg-surface-muted p-3 text-sm">
              {statement.totals.balance > 0 ? (
                <>الرصيد المستحق على العميل:{' '}
                  <strong className="tabular">
                    {formatMoney(statement.totals.balance, symbol)}
                  </strong>
                </>
              ) : statement.totals.balance < 0 ? (
                <>رصيد دائن للعميل:{' '}
                  <strong className="tabular">
                    {formatMoney(Math.abs(statement.totals.balance), symbol)}
                  </strong>
                </>
              ) : (
                <>الحساب مسدّد بالكامل.</>
              )}
            </p>
          </CardContent>
        </Card>
      )}
    </>
  )
}
