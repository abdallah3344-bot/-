import type { Metadata } from 'next'
import { requirePermission } from '@/lib/auth/session'
import { listTasks, getTaskCounts } from '@/modules/tasks/queries'
import { listOpenCases } from '@/modules/hearings/queries'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { FilterBar } from '@/components/shared/filter-bar'
import { Pagination } from '@/components/shared/pagination'
import { StatCard } from '@/components/shared/stat-card'
import { TasksView } from '@/modules/tasks/components/tasks-view'
import type { SearchParams } from '@/lib/query'
import {
  TASK_STATUSES, TASK_STATUS_LABELS, PRIORITIES, PRIORITY_LABELS,
} from '@/lib/constants/enums'

export const metadata: Metadata = { title: 'المهام' }

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const user = await requirePermission('tasks', 'view')
  const params = await searchParams
  const supabase = await createClient()

  const [{ rows, total, page, pageSize }, counts, cases, clientsRes, staffRes] = await Promise.all([
    listTasks(params),
    getTaskCounts(),
    listOpenCases(),
    supabase.from('clients').select('id, name').is('deleted_at', null).order('name').limit(1000),
    supabase.from('profiles').select('id, full_name')
      .eq('is_active', true).is('deleted_at', null).order('full_name'),
  ])

  const staff = staffRes.data ?? []

  return (
    <>
      <PageHeader title="المهام" description={`${total} مهمة`} />

      <section className="mb-5 grid gap-3 grid-cols-3">
        <StatCard label="مفتوحة" value={counts.open} icon="ListChecks" href="/tasks?status=open" />
        <StatCard label="متأخرة" value={counts.late} icon="Bell" href="/tasks?status=late"
                  tone={counts.late > 0 ? 'danger' : 'default'} />
        <StatCard label="مكتملة" value={counts.done} icon="ShieldCheck"
                  href="/tasks?status=completed" tone="success" />
      </section>

      <FilterBar
        searchPlaceholder="ابحث في المهام..."
        filters={[
          {
            name: 'status', label: 'الحالة',
            options: [
              { value: 'open', label: 'المفتوحة فقط' },
              ...TASK_STATUSES.map((s) => ({ value: s, label: TASK_STATUS_LABELS[s] })),
            ],
          },
          {
            name: 'priority', label: 'الأولوية',
            options: PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] })),
          },
          {
            name: 'assignee', label: 'المسؤول',
            options: staff.map((s) => ({ value: s.id, label: s.full_name })),
          },
        ]}
      />

      <TasksView
        rows={rows}
        options={{ cases, clients: clientsRes.data ?? [], staff }}
        canCreate={user.permissions.can('tasks', 'create')}
        canUpdate={user.permissions.can('tasks', 'update')}
        canDelete={user.permissions.can('tasks', 'delete')}
      />

      <Pagination page={page} pageSize={pageSize} total={total} />
    </>
  )
}
