import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePermission } from '@/lib/auth/session'
import { REPORTS, REPORT_GROUPS, type ReportDefinition } from '@/modules/reports/definitions'
import { PageHeader } from '@/components/shared/page-header'
import { NavIcon } from '@/components/layout/nav-icon'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = { title: 'التقارير' }

export default async function ReportsPage() {
  const user = await requirePermission('reports', 'view')

  // التقارير المالية تُخفى عمّن لا يملك صلاحية مالية،
  // فلا يظهر للسكرتير تقرير أرباح لا يستطيع فتحه.
  const canSeeFinance =
    user.permissions.can('invoices', 'view') || user.permissions.can('payments', 'view')

  const visible = REPORTS.filter((r) => r.group !== 'finance' || canSeeFinance)

  const groups = Object.keys(REPORT_GROUPS) as ReportDefinition['group'][]

  return (
    <>
      <PageHeader
        title="مركز التقارير"
        description={`${visible.length} تقريرًا جاهزًا — كل تقرير قابل للتصفية والتصدير إلى Excel والطباعة`}
      />

      <div className="space-y-8">
        {groups.map((group) => {
          const items = visible.filter((r) => r.group === group)
          if (items.length === 0) return null

          return (
            <section key={group}>
              <h2 className="mb-3 font-semibold">{REPORT_GROUPS[group]}</h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((report) => (
                  <li key={report.slug}>
                    <Link href={`/reports/${report.slug}`} className="block h-full">
                      <Card className="h-full transition-colors hover:border-gold-400">
                        <CardContent className="flex items-start gap-3 pt-5">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700 dark:bg-navy-800 dark:text-navy-200">
                            <NavIcon name={report.icon} className="size-5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block font-medium">{report.title}</span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {report.description}
                            </span>
                          </span>
                        </CardContent>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </>
  )
}
