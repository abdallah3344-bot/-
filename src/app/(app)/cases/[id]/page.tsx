import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Pencil, User } from 'lucide-react'
import { requirePermission } from '@/lib/auth/session'
import { getCase, listOpponents, getCaseCounts } from '@/modules/cases/queries'
import { createClient } from '@/lib/supabase/server'
import { DetailList } from '@/components/shared/detail-list'
import { EmptyState } from '@/components/shared/empty-state'
import { PrintButton } from '@/components/shared/print-button'
import { OpponentsPanel, type Opponent } from '@/modules/cases/components/opponents-panel'
import { CaseNotesPanel } from '@/modules/cases/components/case-notes-panel'
import { CaseHeaderActions } from '@/modules/cases/components/case-header-actions'
import { ClaimReadiness } from '@/modules/templates/components/claim-readiness'
import { GeneratePanel } from '@/modules/templates/components/generate-panel'
import { MizanSheet } from '@/modules/templates/components/mizan-sheet'
import { checkClaimData } from '@/modules/templates/claim-check'
import { listTemplates } from '@/modules/templates/queries'
import { buildMizanSheet } from '@/modules/templates/mizan'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, formatMoney, formatTime, timeAgo } from '@/lib/utils'
import {
  CASE_STATUS_LABELS, CASE_STATUS_TONE, PRIORITY_LABELS, PRIORITY_TONE,
  LITIGATION_DEGREE_LABELS, HEARING_STATUS_LABELS, HEARING_STATUS_TONE,
  TASK_STATUS_LABELS, TASK_STATUS_TONE, INVOICE_STATUS_LABELS, INVOICE_STATUS_TONE,
  labelOf, toneOf,
} from '@/lib/constants/enums'

export const metadata: Metadata = { title: 'ملف القضية' }

type Ref = { id: string; name_ar?: string; full_name?: string; name?: string } | null

export default async function CaseWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requirePermission('cases', 'view')
  const { id } = await params

  const row = await getCase(id)
  if (!row) notFound()

  const supabase = await createClient()
  const can = user.permissions

  const [opponents, counts, hearingsRes, tasksRes, documentsRes, invoicesRes, expensesRes, notesRes, historyRes] =
    await Promise.all([
      listOpponents(id),
      getCaseCounts(id),
      can.can('hearings', 'view')
        ? supabase.from('hearings')
            .select('id, hearing_date, hearing_time, room, hearing_type, status, result, decision, courts(name_ar)')
            .eq('case_id', id).is('deleted_at', null).order('hearing_date', { ascending: false })
        : Promise.resolve({ data: [] }),
      can.can('tasks', 'view')
        ? supabase.from('tasks')
            .select('id, title, due_date, priority, status, profiles:assignee_id(full_name)')
            .eq('case_id', id).is('deleted_at', null).order('due_date', { nullsFirst: false })
        : Promise.resolve({ data: [] }),
      can.can('documents', 'view')
        ? supabase.from('documents')
            .select('id, name, doc_date, created_at, size_bytes, document_categories(name_ar)')
            .eq('case_id', id).is('deleted_at', null).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      can.can('invoices', 'view')
        ? supabase.from('invoices')
            .select('id, invoice_no, issue_date, total, paid_amount, status')
            .eq('case_id', id).is('deleted_at', null).order('issue_date', { ascending: false })
        : Promise.resolve({ data: [] }),
      can.can('expenses', 'view')
        ? supabase.from('expenses')
            .select('id, amount, spent_at, description, expense_categories(name_ar)')
            .eq('case_id', id).is('deleted_at', null).order('spent_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase.from('case_notes')
        .select('id, body, created_at, profiles:created_by(full_name)')
        .eq('case_id', id).order('created_at', { ascending: false }),
      supabase.from('case_status_history')
        .select('id, from_status, to_status, changed_at, profiles:changed_by(full_name)')
        .eq('case_id', id).order('changed_at', { ascending: false }),
    ])

  const hearings = hearingsRes.data ?? []
  const tasks = tasksRes.data ?? []
  const documents = documentsRes.data ?? []
  const invoices = invoicesRes.data ?? []
  const expenses = expensesRes.data ?? []
  const notes = notesRes.data ?? []
  const history = historyRes.data ?? []

  // تبويب لائحة الدعوى: يُحمَّل فقط لمن يرى المستندات
  const [claimCheck, templates, mizanSheet] = can.can('documents', 'view')
    ? await Promise.all([checkClaimData(id), listTemplates(), buildMizanSheet(id)])
    : [null, [], []]

  const status = String(row.status)
  const isClosed = status === 'closed' || status === 'archived'
  const client = row.clients as Ref
  const caseType = row.case_types as Ref
  const court = row.courts as Ref
  const chamber = row.court_chambers as Ref
  const judge = row.judges as Ref
  const responsible = row.responsible as Ref
  const assistant = row.assistant as Ref

  const expensesTotal = expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0)

  return (
    <>
      {/* ترويسة مساحة العمل */}
      <div className="mb-5 rounded-[var(--radius-app)] border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant={toneOf(CASE_STATUS_TONE, status)}>
                {labelOf(CASE_STATUS_LABELS, status)}
              </Badge>
              <Badge variant={toneOf(PRIORITY_TONE, String(row.priority))}>
                {labelOf(PRIORITY_LABELS, String(row.priority))}
              </Badge>
              {caseType?.name_ar ? <Badge variant="outline">{caseType.name_ar}</Badge> : null}
            </div>

            <h1 className="text-xl font-bold sm:text-2xl">{String(row.title)}</h1>

            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="tabular">{String(row.internal_no)}</span>
              {row.court_case_no ? (
                <span className="tabular">محكمة: {String(row.court_case_no)}</span>
              ) : null}
              {client ? (
                <Link href={`/clients/${client.id}`} className="inline-flex items-center gap-1 hover:text-gold-600">
                  <User className="size-3.5" />
                  {client.name}
                </Link>
              ) : null}
              {responsible?.full_name ? <span>المحامي: {responsible.full_name}</span> : null}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 no-print">
            <PrintButton />
            <CaseHeaderActions
              caseId={id}
              title={String(row.title)}
              isClosed={isClosed}
              canClose={can.can('cases', 'approve')}
              canReopen={can.can('archive', 'approve')}
            />
            {can.can('cases', 'update') && !isClosed ? (
              <Button asChild>
                <Link href={`/cases/${id}/edit`}>
                  <Pencil className="size-4" />
                  تعديل
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        {isClosed && row.close_reason ? (
          <p className="mt-4 rounded-lg bg-surface-muted p-3 text-sm">
            <strong>سبب الإغلاق:</strong> {String(row.close_reason)}
            {row.closed_at ? (
              <span className="text-muted-foreground"> · {formatDate(String(row.closed_at))}</span>
            ) : null}
          </p>
        ) : null}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          {can.can('hearings', 'view') ? (
            <TabsTrigger value="hearings">الجلسات ({counts.hearings})</TabsTrigger>
          ) : null}
          {can.can('documents', 'view') ? (
            <TabsTrigger value="documents">المستندات ({counts.documents})</TabsTrigger>
          ) : null}
          {can.can('tasks', 'view') ? (
            <TabsTrigger value="tasks">المهام ({counts.tasks})</TabsTrigger>
          ) : null}
          <TabsTrigger value="parties">الأطراف ({counts.opponents})</TabsTrigger>
          {can.can('invoices', 'view') ? (
            <TabsTrigger value="invoices">الفواتير ({counts.invoices})</TabsTrigger>
          ) : null}
          {can.can('expenses', 'view') ? (
            <TabsTrigger value="expenses">المصروفات ({counts.expenses})</TabsTrigger>
          ) : null}
          {can.can('documents', 'view') ? (
            <TabsTrigger value="claim">لائحة الدعوى</TabsTrigger>
          ) : null}
          <TabsTrigger value="notes">الملاحظات ({notes.length})</TabsTrigger>
          <TabsTrigger value="history">سجل الحالة</TabsTrigger>
        </TabsList>

        {/* نظرة عامة */}
        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 print-sheet">
              <CardHeader><CardTitle>بيانات القضية</CardTitle></CardHeader>
              <CardContent>
                <DetailList
                  columns={2}
                  items={[
                    { label: 'رقم الملف الداخلي', value: String(row.internal_no), ltr: true },
                    { label: 'رقم القضية في المحكمة', value: row.court_case_no as string, ltr: true },
                    { label: 'العميل', value: client?.name },
                    { label: 'نوع القضية', value: caseType?.name_ar },
                    { label: 'المحكمة', value: court?.name_ar },
                    { label: 'الدائرة', value: chamber?.name_ar },
                    { label: 'القاضي', value: judge?.full_name },
                    { label: 'المحافظة', value: row.governorate as string },
                    {
                      label: 'درجة التقاضي',
                      value: labelOf(LITIGATION_DEGREE_LABELS, row.litigation_degree as string),
                    },
                    { label: 'تاريخ التسجيل', value: formatDate(row.registered_at as string) },
                    { label: 'تاريخ أول جلسة', value: formatDate(row.first_hearing_at as string) },
                    {
                      label: 'قيمة المطالبة',
                      value: row.claim_amount ? formatMoney(row.claim_amount as number) : null,
                      ltr: true,
                    },
                    { label: 'المحامي المسؤول', value: responsible?.full_name },
                    { label: 'المحامي المساعد', value: assistant?.full_name },
                    { label: 'وصف القضية', value: row.description as string, full: true },
                  ]}
                />
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>الجلسة القادمة</CardTitle></CardHeader>
                <CardContent>
                  {(() => {
                    const today = new Date().toISOString().slice(0, 10)
                    const next = [...hearings]
                      .filter((h) => h.hearing_date >= today && h.status === 'scheduled')
                      .sort((a, b) => a.hearing_date.localeCompare(b.hearing_date))[0]

                    if (!next) {
                      return <p className="text-sm text-muted-foreground">لا توجد جلسات قادمة مجدولة.</p>
                    }
                    const hCourt = next.courts as unknown as { name_ar: string } | null
                    return (
                      <div className="space-y-1.5">
                        <p className="text-lg font-semibold tabular">{formatDate(next.hearing_date)}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatTime(next.hearing_time)}
                          {next.room ? ` · قاعة ${next.room}` : ''}
                        </p>
                        <p className="text-sm">{hCourt?.name_ar ?? '—'}</p>
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>

              {row.notes ? (
                <Card>
                  <CardHeader><CardTitle>ملاحظات الملف</CardTitle></CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{String(row.notes)}</p>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>
        </TabsContent>

        {/* الجلسات */}
        {can.can('hearings', 'view') ? (
          <TabsContent value="hearings">
            {hearings.length === 0 ? (
              <EmptyState icon="Gavel" title="لا توجد جلسات مسجّلة"
                          description="أضف جلسات هذه القضية لتظهر في التقويم والتنبيهات." />
            ) : (
              <ul className="divide-y divide-border rounded-[var(--radius-app)] border border-border bg-surface">
                {hearings.map((h) => {
                  const hCourt = h.courts as unknown as { name_ar: string } | null
                  return (
                    <li key={h.id} className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium tabular">
                            {formatDate(h.hearing_date)}
                            {h.hearing_time ? ` · ${formatTime(h.hearing_time)}` : ''}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {hCourt?.name_ar ?? 'محكمة غير محدّدة'}
                            {h.room ? ` · قاعة ${h.room}` : ''}
                          </p>
                        </div>
                        <Badge variant={toneOf(HEARING_STATUS_TONE, h.status)}>
                          {labelOf(HEARING_STATUS_LABELS, h.status)}
                        </Badge>
                      </div>
                      {h.result || h.decision ? (
                        <p className="mt-2 text-sm">
                          {h.result ? <span className="block">النتيجة: {h.result}</span> : null}
                          {h.decision ? <span className="block">القرار: {h.decision}</span> : null}
                        </p>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </TabsContent>
        ) : null}

        {/* المستندات */}
        {can.can('documents', 'view') ? (
          <TabsContent value="documents">
            {documents.length === 0 ? (
              <EmptyState icon="FolderOpen" title="لا توجد مستندات"
                          description="لكل قضية مجلد إلكتروني. ارفع المستندات من وحدة المستندات." />
            ) : (
              <ul className="divide-y divide-border rounded-[var(--radius-app)] border border-border bg-surface">
                {documents.map((d) => {
                  const cat = d.document_categories as unknown as { name_ar: string } | null
                  return (
                    <li key={d.id} className="flex items-center justify-between gap-3 p-4">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{d.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {cat?.name_ar ?? 'غير مصنّف'} · {formatDate(d.doc_date ?? d.created_at)}
                        </span>
                      </span>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/documents?case=${id}`}>عرض</Link>
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </TabsContent>
        ) : null}

        {/* المهام */}
        {can.can('tasks', 'view') ? (
          <TabsContent value="tasks">
            {tasks.length === 0 ? (
              <EmptyState icon="ListChecks" title="لا توجد مهام" />
            ) : (
              <ul className="divide-y divide-border rounded-[var(--radius-app)] border border-border bg-surface">
                {tasks.map((t) => {
                  const assignee = t.profiles as unknown as { full_name: string } | null
                  return (
                    <li key={t.id} className="flex items-center justify-between gap-3 p-4">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{t.title}</span>
                        <span className="block text-xs text-muted-foreground">
                          {t.due_date ? formatDate(t.due_date) : 'بلا تاريخ استحقاق'}
                          {assignee ? ` · ${assignee.full_name}` : ''}
                        </span>
                      </span>
                      <Badge variant={toneOf(TASK_STATUS_TONE, t.status)}>
                        {labelOf(TASK_STATUS_LABELS, t.status)}
                      </Badge>
                    </li>
                  )
                })}
              </ul>
            )}
          </TabsContent>
        ) : null}

        {/* الأطراف */}
        <TabsContent value="parties">
          <div className="space-y-5">
            <Card>
              <CardHeader><CardTitle>الموكّل</CardTitle></CardHeader>
              <CardContent>
                {client ? (
                  <Link href={`/clients/${client.id}`}
                        className="inline-flex items-center gap-2 font-medium hover:text-gold-600">
                    <User className="size-4" />
                    {client.name}
                  </Link>
                ) : (
                  <p className="text-sm text-muted-foreground">غير محدّد</p>
                )}
              </CardContent>
            </Card>

            <div>
              <h3 className="mb-3 font-semibold">الخصوم</h3>
              <OpponentsPanel
                caseId={id}
                opponents={opponents as Opponent[]}
                canEdit={can.can('cases', 'update') && !isClosed}
              />
            </div>
          </div>
        </TabsContent>

        {/* الفواتير */}
        {can.can('invoices', 'view') ? (
          <TabsContent value="invoices">
            {invoices.length === 0 ? (
              <EmptyState icon="Receipt" title="لا توجد فواتير لهذه القضية" />
            ) : (
              <ul className="divide-y divide-border rounded-[var(--radius-app)] border border-border bg-surface">
                {invoices.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between gap-3 p-4">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium tabular">{inv.invoice_no}</span>
                      <span className="block text-xs text-muted-foreground">
                        {formatDate(inv.issue_date)}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-sm font-semibold tabular">{formatMoney(inv.total)}</span>
                      <Badge variant={toneOf(INVOICE_STATUS_TONE, inv.status)}>
                        {labelOf(INVOICE_STATUS_LABELS, inv.status)}
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        ) : null}

        {/* المصروفات */}
        {can.can('expenses', 'view') ? (
          <TabsContent value="expenses">
            {expenses.length === 0 ? (
              <EmptyState icon="TrendingDown" title="لا توجد مصروفات مسجّلة" />
            ) : (
              <>
                <ul className="divide-y divide-border rounded-[var(--radius-app)] border border-border bg-surface">
                  {expenses.map((e) => {
                    const cat = e.expense_categories as unknown as { name_ar: string } | null
                    return (
                      <li key={e.id} className="flex items-center justify-between gap-3 p-4">
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">
                            {cat?.name_ar ?? 'مصروف'}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {formatDate(e.spent_at)}
                            {e.description ? ` · ${e.description}` : ''}
                          </span>
                        </span>
                        <span className="text-sm font-semibold tabular">{formatMoney(e.amount)}</span>
                      </li>
                    )
                  })}
                </ul>
                <p className="mt-3 text-end text-sm">
                  إجمالي المصروفات:{' '}
                  <strong className="tabular">{formatMoney(expensesTotal)}</strong>
                </p>
              </>
            )}
          </TabsContent>
        ) : null}

        {/* الملاحظات */}
        {/* لائحة الدعوى: جاهزية البيانات، توليد المستندات، ورقة ميزان */}
        {can.can('documents', 'view') ? (
          <TabsContent value="claim">
            <div className="space-y-4">
              {claimCheck ? <ClaimReadiness check={claimCheck} /> : null}

              {can.can('documents', 'create') ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">توليد مستند من قالب</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <GeneratePanel templates={templates} caseId={id} />
                  </CardContent>
                </Card>
              ) : null}

              <MizanSheet
                sections={mizanSheet}
                caseId={id}
                canExport={can.can('cases', 'export')}
              />
            </div>
          </TabsContent>
        ) : null}

        <TabsContent value="notes">
          <CaseNotesPanel
            caseId={id}
            notes={notes as unknown as {
              id: string; body: string; created_at: string
              profiles: { full_name: string } | null
            }[]}
            canAdd={can.can('cases', 'update')}
          />
        </TabsContent>

        {/* سجل الحالة */}
        <TabsContent value="history">
          {history.length === 0 ? (
            <EmptyState icon="History" title="لا يوجد تغيير في الحالة بعد" />
          ) : (
            <ul className="divide-y divide-border rounded-[var(--radius-app)] border border-border bg-surface">
              {history.map((h) => {
                const by = h.profiles as unknown as { full_name: string } | null
                return (
                  <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                    <span className="text-sm">
                      {h.from_status ? (
                        <>
                          من <strong>{labelOf(CASE_STATUS_LABELS, h.from_status)}</strong> إلى{' '}
                        </>
                      ) : (
                        'الحالة الأولى: '
                      )}
                      <strong>{labelOf(CASE_STATUS_LABELS, h.to_status)}</strong>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {by?.full_name ?? 'النظام'} · {timeAgo(h.changed_at)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </>
  )
}
