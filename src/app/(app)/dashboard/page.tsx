import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePermission } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/empty-state'
import { CaseCharts } from '@/modules/dashboard/components/case-charts'
import { formatMoney, formatDate, formatTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'لوحة التحكم' }

type Stats = {
  clients_total: number; clients_active: number
  cases_total: number; cases_open: number; cases_closed: number
  hearings_today: number; hearings_upcoming: number
  tasks_late: number; tasks_open: number
  appointments_upcoming: number
  fees_total: number; payments_total: number; expenses_total: number
  receivables: number; net_revenue: number
}

export default async function DashboardPage() {
  const user = await requirePermission('dashboard', 'view')
  const supabase = await createClient()

  const canSeeFinance = user.permissions.can('invoices', 'view') || user.permissions.can('payments', 'view')

  const [statsRes, distRes, todayRes, tasksRes] = await Promise.all([
    supabase.rpc('dashboard_stats'),
    supabase.rpc('case_distribution'),
    supabase
      .from('hearings')
      .select('id, hearing_date, hearing_time, room, cases(id, title, internal_no), courts(name_ar)')
      .eq('hearing_date', new Date().toISOString().slice(0, 10))
      .eq('status', 'scheduled')
      .order('hearing_time', { ascending: true })
      .limit(6),
    supabase
      .from('tasks')
      .select('id, title, due_date, priority, status, cases(id, title)')
      .neq('status', 'completed')
      .neq('status', 'cancelled')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(6),
  ])

  const stats = (statsRes.data ?? {}) as Partial<Stats>
  const dist = distRes.data as Record<string, unknown> | null
  const todayHearings = todayRes.data ?? []
  const openTasks = tasksRes.data ?? []

  return (
    <>
      <PageHeader
        title={`أهلًا، ${user.fullName}`}
        description="نظرة عامة على نشاط المكتب اليوم"
      />

      {/* مؤشرات القضايا والعملاء */}
      <section className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="العملاء" value={stats.clients_total ?? 0} icon="Users"
                  href="/clients" hint={`${stats.clients_active ?? 0} نشط`} />
        <StatCard label="إجمالي القضايا" value={stats.cases_total ?? 0} icon="Briefcase" href="/cases" />
        <StatCard label="القضايا المفتوحة" value={stats.cases_open ?? 0} icon="FolderOpen"
                  href="/cases?status=open" tone="gold" />
        <StatCard label="القضايا المغلقة" value={stats.cases_closed ?? 0} icon="Archive"
                  href="/archive" tone="success" />
      </section>

      {/* مؤشرات الجلسات والمهام */}
      <section className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="جلسات اليوم" value={stats.hearings_today ?? 0} icon="Gavel"
                  href="/hearings?range=today" tone={(stats.hearings_today ?? 0) > 0 ? 'warning' : 'default'} />
        <StatCard label="الجلسات القادمة" value={stats.hearings_upcoming ?? 0} icon="CalendarDays"
                  href="/hearings?range=upcoming" />
        <StatCard label="المهام المتأخرة" value={stats.tasks_late ?? 0} icon="ListChecks"
                  href="/tasks?status=late" tone={(stats.tasks_late ?? 0) > 0 ? 'danger' : 'default'} />
        <StatCard label="المواعيد القادمة" value={stats.appointments_upcoming ?? 0} icon="Bell"
                  href="/calendar" />
      </section>

      {/* المؤشرات المالية — تظهر فقط لمن يملك صلاحية مالية */}
      {canSeeFinance ? (
        <section className="grid gap-3 grid-cols-2 lg:grid-cols-5 mb-6">
          <StatCard label="إجمالي الأتعاب" value={formatMoney(stats.fees_total)} icon="Banknote" href="/fees" />
          <StatCard label="المقبوضات" value={formatMoney(stats.payments_total)} icon="HandCoins"
                    href="/payments" tone="success" />
          <StatCard label="المستحقات" value={formatMoney(stats.receivables)} icon="Receipt"
                    href="/invoices?status=unpaid" tone="warning" />
          <StatCard label="المصروفات" value={formatMoney(stats.expenses_total)} icon="TrendingDown"
                    href="/expenses" tone="danger" />
          <StatCard label="صافي الإيرادات" value={formatMoney(stats.net_revenue)} icon="Wallet"
                    href="/accounts" tone="gold" />
        </section>
      ) : null}

      {/* الرسوم البيانية */}
      {dist ? <CaseCharts data={dist} showFinance={canSeeFinance} /> : null}

      {/* جلسات اليوم والمهام */}
      <section className="grid gap-4 lg:grid-cols-2 mt-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>جلسات اليوم</CardTitle>
            <Link href="/hearings" className="text-xs text-muted-foreground hover:underline">
              عرض الكل
            </Link>
          </CardHeader>
          <CardContent>
            {todayHearings.length === 0 ? (
              <EmptyState icon="Gavel" title="لا توجد جلسات اليوم"
                          description="ستظهر هنا جلسات اليوم المجدولة تلقائيًا." />
            ) : (
              <ul className="divide-y divide-border">
                {todayHearings.map((h) => {
                  const c = h.cases as unknown as { id: string; title: string; internal_no: string } | null
                  const court = h.courts as unknown as { name_ar: string } | null
                  return (
                    <li key={h.id} className="py-3 first:pt-0 last:pb-0">
                      <Link href={c ? `/cases/${c.id}` : '/hearings'}
                            className="flex items-start justify-between gap-3 hover:opacity-80">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{c?.title ?? '—'}</span>
                          <span className="block text-xs text-muted-foreground truncate">
                            {court?.name_ar ?? 'محكمة غير محدّدة'}
                            {h.room ? ` · قاعة ${h.room}` : ''}
                          </span>
                        </span>
                        <Badge variant="gold" className="shrink-0 tabular">
                          {formatTime(h.hearing_time)}
                        </Badge>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>المهام المفتوحة</CardTitle>
            <Link href="/tasks" className="text-xs text-muted-foreground hover:underline">
              عرض الكل
            </Link>
          </CardHeader>
          <CardContent>
            {openTasks.length === 0 ? (
              <EmptyState icon="ListChecks" title="لا توجد مهام مفتوحة"
                          description="كل المهام منجزة — عمل ممتاز." />
            ) : (
              <ul className="divide-y divide-border">
                {openTasks.map((t) => {
                  const overdue = t.due_date ? new Date(t.due_date) < new Date(new Date().toDateString()) : false
                  return (
                    <li key={t.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{t.title}</span>
                        <span className="block text-xs text-muted-foreground">
                          {t.due_date ? formatDate(t.due_date) : 'بلا تاريخ استحقاق'}
                        </span>
                      </span>
                      <Badge variant={overdue ? 'danger' : 'muted'} className="shrink-0">
                        {overdue ? 'متأخرة' : 'قيد التنفيذ'}
                      </Badge>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  )
}
