import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { requirePermission } from '@/lib/auth/session'
import { findReport, FINANCE_REPORT_SLUGS } from '@/modules/reports/definitions'
import { runReport, getReportFilterOptions } from '@/modules/reports/queries'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { ReportToolbar } from '@/modules/reports/components/report-toolbar'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { formatDate, formatMoney, cn } from '@/lib/utils'
import { readParam, type SearchParams } from '@/lib/query'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  return { title: findReport(slug)?.title ?? 'تقرير' }
}

export default async function ReportPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<SearchParams>
}) {
  const user = await requirePermission('reports', 'view')
  const [{ slug }, query] = await Promise.all([params, searchParams])

  const report = findReport(slug)
  if (!report) notFound()

  // التقارير المالية تتطلّب صلاحية مالية فوق reports.view
  if (FINANCE_REPORT_SLUGS.has(slug)) {
    const canSeeFinance =
      user.permissions.can('invoices', 'view') || user.permissions.can('payments', 'view')
    if (!canSeeFinance) redirect('/forbidden?module=invoices&action=view')
  }

  const supabase = await createClient()
  const [rows, options, settingsRes] = await Promise.all([
    runReport(slug, {
      from: readParam(query, 'from'),
      to: readParam(query, 'to'),
      lawyer: readParam(query, 'lawyer'),
      court: readParam(query, 'court'),
      caseType: readParam(query, 'caseType'),
      status: readParam(query, 'status'),
      client: readParam(query, 'client'),
    }),
    getReportFilterOptions(),
    supabase.from('settings').select('currency_symbol, office_name').maybeSingle(),
  ])

  const symbol = settingsRes.data?.currency_symbol ?? 'ر.س'

  const totals = report.totals
    ? Object.fromEntries(
        report.totals.map((key) => [
          key,
          rows.reduce((sum, row) => sum + (Number(row[key]) || 0), 0),
        ]),
      )
    : null

  function render(value: string | number | null, format?: string) {
    if (value === null || value === undefined || value === '') return '—'
    if (format === 'money') return formatMoney(Number(value), symbol)
    if (format === 'date') return formatDate(String(value))
    if (format === 'number') return Number(value).toLocaleString('en-US')
    return String(value)
  }

  return (
    <>
      <PageHeader title={report.title} description={`${rows.length} سجل · ${report.description}`}>
        <Button variant="outline" asChild>
          <Link href="/reports">
            <ArrowRight className="size-4" />
            كل التقارير
          </Link>
        </Button>
      </PageHeader>

      <ReportToolbar
        report={report}
        options={options}
        rows={rows}
        canPrint={user.permissions.can('reports', 'print')}
        canExport={user.permissions.can('reports', 'export')}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={report.icon}
          title="لا توجد بيانات في هذا التقرير"
          description="جرّب توسيع النطاق الزمني أو إزالة بعض عوامل التصفية."
        />
      ) : (
        <div className="print-sheet overflow-hidden rounded-[var(--radius-app)] border border-border bg-surface">
          {/* ترويسة تظهر عند الطباعة فقط */}
          <div className="print-only border-b border-border p-4">
            <h2 className="font-bold">{settingsRes.data?.office_name ?? 'مكتب المحاماة'}</h2>
            <p className="text-sm">{report.title}</p>
            <p className="text-xs">تاريخ الإصدار: {formatDate(new Date())}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted">
                <tr>
                  {report.columns.map((col) => (
                    <th
                      key={col.key}
                      className={cn(
                        'whitespace-nowrap p-2.5 text-xs font-semibold text-muted-foreground',
                        col.align === 'end' ? 'text-end' : 'text-start',
                      )}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="border-t border-border">
                    {report.columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          'p-2.5',
                          col.align === 'end' ? 'text-end tabular' : 'text-start',
                          (col.format === 'date' || col.format === 'number') && 'tabular whitespace-nowrap',
                        )}
                      >
                        {render(row[col.key], col.format)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>

              {totals ? (
                <tfoot>
                  <tr className="border-t-2 border-border bg-surface-muted font-bold">
                    {report.columns.map((col, index) => (
                      <td key={col.key}
                          className={cn('p-2.5', col.align === 'end' ? 'text-end tabular' : 'text-start')}>
                        {index === 0
                          ? 'الإجمالي'
                          : totals[col.key] !== undefined
                            ? render(totals[col.key], col.format)
                            : ''}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </div>
      )}
    </>
  )
}
