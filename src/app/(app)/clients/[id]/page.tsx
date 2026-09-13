import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Pencil, Briefcase, Phone, MessageCircle } from 'lucide-react'
import { requirePermission } from '@/lib/auth/session'
import { getClient, getClientSummary } from '@/modules/clients/queries'
import { createClient as createSupabase } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { DetailList } from '@/components/shared/detail-list'
import { StatCard } from '@/components/shared/stat-card'
import { EmptyState } from '@/components/shared/empty-state'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PrintButton } from '@/components/shared/print-button'
import { formatDate, formatMoney } from '@/lib/utils'
import {
  CLIENT_TYPE_LABELS, CLIENT_STATUS_LABELS, CLIENT_STATUS_TONE,
  CASE_STATUS_LABELS, CASE_STATUS_TONE, labelOf, toneOf,
} from '@/lib/constants/enums'

export const metadata: Metadata = { title: 'ملف العميل' }

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requirePermission('clients', 'view')
  const { id } = await params

  const client = await getClient(id)
  if (!client) notFound()

  const supabase = await createSupabase()
  const canSeeFinance = user.permissions.can('invoices', 'view') || user.permissions.can('payments', 'view')

  const [summary, casesRes, documentsRes] = await Promise.all([
    getClientSummary(id),
    user.permissions.can('cases', 'view')
      ? supabase
          .from('cases')
          .select('id, internal_no, title, status, priority, registered_at, case_types(name_ar)')
          .eq('client_id', id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    user.permissions.can('documents', 'view')
      ? supabase
          .from('documents')
          .select('id, name, doc_date, created_at, document_categories(name_ar)')
          .eq('client_id', id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [] }),
  ])

  const cases = casesRes.data ?? []
  const documents = documentsRes.data ?? []

  return (
    <>
      <PageHeader title={client.name} description={`رقم العميل: ${client.client_no}`}>
        <Badge variant={toneOf(CLIENT_STATUS_TONE, client.status)}>
          {labelOf(CLIENT_STATUS_LABELS, client.status)}
        </Badge>
        <PrintButton />
        {user.permissions.can('cases', 'create') ? (
          <Button variant="outline" asChild>
            <Link href={`/cases/new?client=${client.id}`}>
              <Briefcase className="size-4" />
              فتح قضية
            </Link>
          </Button>
        ) : null}
        {user.permissions.can('clients', 'update') ? (
          <Button asChild>
            <Link href={`/clients/${client.id}/edit`}>
              <Pencil className="size-4" />
              تعديل
            </Link>
          </Button>
        ) : null}
      </PageHeader>

      {/* مؤشرات سريعة */}
      <section className="mb-6 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard label="إجمالي القضايا" value={summary.casesTotal} icon="Briefcase" />
        <StatCard label="القضايا المفتوحة" value={summary.casesOpen} icon="FolderOpen" tone="gold" />
        {canSeeFinance ? (
          <>
            <StatCard label="إجمالي الفواتير" value={formatMoney(summary.billed)} icon="Receipt" />
            <StatCard
              label="المتبقي على العميل"
              value={formatMoney(summary.outstanding)}
              icon="HandCoins"
              tone={summary.outstanding > 0 ? 'warning' : 'success'}
            />
          </>
        ) : (
          <StatCard label="المستندات" value={summary.documentsTotal} icon="FolderOpen" />
        )}
      </section>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">البيانات الأساسية</TabsTrigger>
          <TabsTrigger value="cases">القضايا ({summary.casesTotal})</TabsTrigger>
          <TabsTrigger value="documents">المستندات ({summary.documentsTotal})</TabsTrigger>
          <TabsTrigger value="notes">الملاحظات</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="print-sheet">
            <CardHeader>
              <CardTitle>بيانات العميل</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailList
                columns={3}
                items={[
                  { label: 'رقم العميل', value: client.client_no, ltr: true },
                  { label: 'الاسم', value: client.name },
                  { label: 'النوع', value: labelOf(CLIENT_TYPE_LABELS, client.client_type) },
                  { label: 'رقم الهوية / السجل', value: client.national_id, ltr: true },
                  { label: 'المهنة / النشاط', value: client.occupation },
                  { label: 'تاريخ فتح الملف', value: formatDate(client.file_opened_at) },
                  {
                    label: 'الهاتف',
                    value: client.phone ? (
                      <a href={`tel:${client.phone}`} className="inline-flex items-center gap-1.5 hover:text-gold-600">
                        <Phone className="size-3.5" />
                        <span dir="ltr">{client.phone}</span>
                      </a>
                    ) : null,
                  },
                  {
                    label: 'واتساب',
                    value: client.whatsapp ? (
                      <a
                        href={`https://wa.me/${client.whatsapp.replace(/[^0-9]/g, '')}`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 hover:text-gold-600"
                      >
                        <MessageCircle className="size-3.5" />
                        <span dir="ltr">{client.whatsapp}</span>
                      </a>
                    ) : null,
                  },
                  {
                    label: 'البريد الإلكتروني',
                    value: client.email ? (
                      <a href={`mailto:${client.email}`} className="hover:text-gold-600" dir="ltr">
                        {client.email}
                      </a>
                    ) : null,
                  },
                  { label: 'العنوان', value: client.address, full: true },
                  { label: 'المحامي المسؤول', value: client.profiles?.full_name },
                  { label: 'الحالة', value: labelOf(CLIENT_STATUS_LABELS, client.status) },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cases">
          {cases.length === 0 ? (
            <EmptyState
              icon="Briefcase"
              title="لا توجد قضايا لهذا العميل"
              description="افتح قضية جديدة لربطها بملف العميل."
            >
              {user.permissions.can('cases', 'create') ? (
                <Button asChild size="sm">
                  <Link href={`/cases/new?client=${client.id}`}>
                    <Briefcase className="size-4" />
                    فتح قضية
                  </Link>
                </Button>
              ) : null}
            </EmptyState>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {cases.map((c) => {
                const type = c.case_types as unknown as { name_ar: string } | null
                return (
                  <li key={c.id}>
                    <Link
                      href={`/cases/${c.id}`}
                      className="block rounded-[var(--radius-app)] border border-border bg-surface p-4 transition-colors hover:border-gold-400"
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{c.title}</span>
                          <span className="block text-xs text-muted-foreground tabular">
                            {c.internal_no}
                          </span>
                        </span>
                        <Badge variant={toneOf(CASE_STATUS_TONE, c.status)} className="shrink-0">
                          {labelOf(CASE_STATUS_LABELS, c.status)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {type?.name_ar ?? 'نوع غير محدّد'}
                        {c.registered_at ? ` · ${formatDate(c.registered_at)}` : ''}
                      </p>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="documents">
          {documents.length === 0 ? (
            <EmptyState
              icon="FolderOpen"
              title="لا توجد مستندات"
              description="ستظهر هنا المستندات المرفوعة باسم هذا العميل."
            />
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
                      <Link href={`/documents?client=${client.id}`}>عرض</Link>
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>ملاحظات</CardTitle>
            </CardHeader>
            <CardContent>
              {client.notes ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{client.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground">لا توجد ملاحظات مسجّلة.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
