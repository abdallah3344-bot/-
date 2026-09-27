import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { formatDate, timeAgo } from '@/lib/utils'
import { LICENSE_STATE_LABELS } from '@/modules/license/constants'
import { OfficeActiveSwitch, OfficeSlugEditor } from '@/modules/offices/components/office-row-actions'

export const metadata: Metadata = { title: 'المكاتب المشتركة' }

type OfficeRow = {
  id: string
  name: string
  slug: string | null
  phone: string | null
  email: string | null
  is_active: boolean
  is_founding: boolean
  created_at: string
  users_count: number
  clients_count: number
  cases_count: number
  last_activity: string | null
  license_state: string | null
  license_checked_at: string | null
  admin_username: string | null
}

const LICENSE_TONE: Record<string, 'success' | 'warning' | 'danger' | 'muted'> = {
  licensed_valid: 'success',
  trial_active: 'success',
  trial_pending: 'warning',
  device_pending: 'warning',
  expired: 'danger',
  trial_expired: 'danger',
  trial_rejected: 'danger',
  invalid_key: 'danger',
}

/**
 * صفحة مالك المنصة: كل المكاتب المشتركة بأعدادها وحالة ترخيصها.
 * لا تعرض أي بيانات موكّلين أو قضايا — القاعدة ترجع أعدادًا فقط.
 */
export default async function PlatformPage() {
  const user = await requireAuth()
  if (!user.isPlatformAdmin) redirect('/forbidden')

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('platform_offices')
  if (error) throw new Error(`تعذّر تحميل المكاتب: ${error.message}`)
  const offices = (data ?? []) as OfficeRow[]

  const active = offices.filter((o) => o.is_active).length
  const pending = offices.filter((o) => o.license_state === 'trial_pending' || o.license_state === 'not_activated' || !o.license_state).length

  return (
    <>
      <PageHeader
        title="المكاتب المشتركة"
        description="كل مكتب يعمل على بياناته وحده. هنا الأعداد وحالة الترخيص فقط، ولا تظهر بيانات أي مكتب."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="كل المكاتب" value={offices.length} icon="Building2" />
        <StatCard label="مكاتب فعّالة" value={active} icon="ShieldCheck" tone="success" />
        <StatCard label="بانتظار اعتماد الترخيص" value={pending} icon="Bell" tone={pending ? 'warning' : 'default'}
          hint="اعتمدها من لوحة التراخيص" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المكتب</TableHead>
                  <TableHead>التواصل</TableHead>
                  <TableHead className="text-center">المستخدمون</TableHead>
                  <TableHead className="text-center">الموكّلون</TableHead>
                  <TableHead className="text-center">القضايا</TableHead>
                  <TableHead>الترخيص</TableHead>
                  <TableHead>آخر نشاط</TableHead>
                  <TableHead>الرابط الخاص</TableHead>
                  <TableHead className="text-center">فعّال</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offices.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <div className="font-medium">
                        {o.name}
                        {o.is_founding ? <Badge variant="gold" className="ms-2">المكتب الأول</Badge> : null}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        سُجّل {formatDate(o.created_at)}
                        {o.admin_username ? <> · المدير: <span dir="ltr">{o.admin_username}</span></> : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {o.phone ? <div dir="ltr" className="text-end">{o.phone}</div> : null}
                      {o.email ? <div dir="ltr" className="text-end text-muted-foreground">{o.email}</div> : null}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">{o.users_count}</TableCell>
                    <TableCell className="text-center tabular-nums">{o.clients_count}</TableCell>
                    <TableCell className="text-center tabular-nums">{o.cases_count}</TableCell>
                    <TableCell>
                      <Badge variant={LICENSE_TONE[o.license_state ?? ''] ?? 'muted'}>
                        {LICENSE_STATE_LABELS[o.license_state ?? ''] ?? 'لم يُفحص بعد'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {o.last_activity ? timeAgo(o.last_activity) : '—'}
                    </TableCell>
                    <TableCell>
                      <OfficeSlugEditor officeId={o.id} slug={o.slug} />
                    </TableCell>
                    <TableCell className="text-center">
                      <OfficeActiveSwitch officeId={o.id} active={o.is_active} locked={o.is_founding} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
