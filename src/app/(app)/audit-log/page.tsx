import type { Metadata } from 'next'
import { requirePermission } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { FilterBar } from '@/components/shared/filter-bar'
import { DataTable, type Column } from '@/components/shared/data-table'
import { Pagination } from '@/components/shared/pagination'
import { PrintButton } from '@/components/shared/print-button'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, timeAgo } from '@/lib/utils'
import {
  DEFAULT_PAGE_SIZE, pageRange, readPage, readParam, orIlike, type SearchParams,
} from '@/lib/query'

export const metadata: Metadata = { title: 'سجل العمليات' }

const ACTION_LABELS: Record<string, string> = {
  login: 'تسجيل دخول',
  logout: 'تسجيل خروج',
  login_failed: 'محاولة دخول فاشلة',
  create: 'إضافة',
  update: 'تعديل',
  delete: 'حذف',
  restore: 'استعادة',
  upload: 'رفع مستند',
  download: 'تحميل مستند',
  print: 'طباعة',
  export: 'تصدير',
  permission_change: 'تغيير صلاحيات',
  password_change: 'تغيير كلمة مرور',
  approve: 'اعتماد',
  close: 'إغلاق',
  reopen: 'إعادة فتح',
  backup: 'نسخ احتياطي',
  restore_backup: 'استعادة نسخة',
}

const ACTION_TONE: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'muted' | 'gold'> = {
  login: 'success',
  logout: 'muted',
  login_failed: 'danger',
  create: 'success',
  update: 'info',
  delete: 'danger',
  restore: 'warning',
  upload: 'info',
  download: 'muted',
  permission_change: 'gold',
  password_change: 'warning',
  close: 'muted',
  reopen: 'warning',
}

const ENTITY_LABELS: Record<string, string> = {
  auth: 'المصادقة',
  profiles: 'المستخدمون',
  roles: 'الأدوار',
  clients: 'العملاء',
  cases: 'القضايا',
  opponents: 'الخصوم',
  hearings: 'الجلسات',
  tasks: 'المهام',
  documents: 'المستندات',
  powers_of_attorney: 'الوكالات',
  contracts: 'العقود',
  case_fees: 'الأتعاب',
  invoices: 'الفواتير',
  payments: 'المقبوضات',
  expenses: 'المصروفات',
  accounts: 'الحسابات',
  correspondence: 'المراسلات',
  settings: 'الإعدادات',
}

type AuditRow = {
  id: number
  user_name: string | null
  action: string
  entity: string
  entity_label: string | null
  summary: string | null
  changes: unknown
  ip_address: string | null
  created_at: string
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const user = await requirePermission('audit', 'view')
  const params = await searchParams
  const supabase = await createClient()

  const page = readPage(params)
  const { from, to } = pageRange(page)
  const term = readParam(params, 'q')
  const action = readParam(params, 'action')
  const entity = readParam(params, 'entity')

  let query = supabase
    .from('audit_logs')
    .select('id, user_name, action, entity, entity_label, summary, changes, ip_address, created_at',
            { count: 'exact' })

  if (term) query = query.or(orIlike(['user_name', 'summary', 'entity_label'], term))
  if (action) query = query.eq('action', action)
  if (entity) query = query.eq('entity', entity)

  const { data, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  const rows = (data ?? []) as AuditRow[]

  const columns: Column<AuditRow>[] = [
    {
      key: 'when',
      header: 'التاريخ والوقت',
      cell: (row) => (
        <span className="block">
          <span className="block text-sm tabular whitespace-nowrap">
            {formatDateTime(row.created_at)}
          </span>
          <span className="block text-xs text-muted-foreground">{timeAgo(row.created_at)}</span>
        </span>
      ),
    },
    {
      key: 'user',
      header: 'المستخدم',
      cell: (row) => <span className="text-sm">{row.user_name ?? 'غير معروف'}</span>,
    },
    {
      key: 'action',
      header: 'العملية',
      cell: (row) => (
        <Badge variant={ACTION_TONE[row.action] ?? 'muted'}>
          {ACTION_LABELS[row.action] ?? row.action}
        </Badge>
      ),
    },
    {
      key: 'entity',
      header: 'السجل المتأثر',
      hideBelow: 'md',
      cell: (row) => (
        <span className="block">
          <span className="block text-sm">{ENTITY_LABELS[row.entity] ?? row.entity}</span>
          {row.entity_label ? (
            <span className="block truncate text-xs text-muted-foreground">
              {row.entity_label}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'summary',
      header: 'التفاصيل',
      hideBelow: 'lg',
      cell: (row) => (
        <span className="block max-w-72 truncate text-sm text-muted-foreground">
          {row.summary ?? '—'}
        </span>
      ),
    },
    {
      key: 'ip',
      header: 'عنوان IP',
      hideBelow: 'lg',
      cell: (row) => (
        <span className="text-xs text-muted-foreground tabular" dir="ltr">
          {row.ip_address ?? '—'}
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="سجل العمليات"
        description={`${count ?? 0} عملية مسجّلة — السجل غير قابل للتعديل أو الحذف من داخل النظام`}
      >
        {user.permissions.can('audit', 'export') ? <PrintButton /> : null}
      </PageHeader>

      <FilterBar
        searchPlaceholder="ابحث بالمستخدم أو التفاصيل..."
        filters={[
          {
            name: 'action', label: 'العملية',
            options: Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label })),
          },
          {
            name: 'entity', label: 'السجل',
            options: Object.entries(ENTITY_LABELS).map(([value, label]) => ({ value, label })),
          },
        ]}
      />

      <DataTable
        rows={rows} columns={columns} rowKey={(row) => String(row.id)}
        emptyIcon="History"
        emptyTitle="لا توجد عمليات مطابقة"
        emptyDescription="يسجّل النظام تلقائيًا كل عمليات الدخول والإضافة والتعديل والحذف ورفع المستندات وتغيير الصلاحيات."
      />

      <Pagination page={page} pageSize={DEFAULT_PAGE_SIZE} total={count ?? 0} />
    </>
  )
}
