import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, Phone, UserPlus } from 'lucide-react'
import { requirePermission } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { FilterBar } from '@/components/shared/filter-bar'
import { PrintButton } from '@/components/shared/print-button'
import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { initials, timeAgo } from '@/lib/utils'
import { orIlike, readParam, type SearchParams } from '@/lib/query'

export const metadata: Metadata = { title: 'المحامون والموظفون' }

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const user = await requirePermission('staff', 'view')
  const params = await searchParams
  const supabase = await createClient()

  const term = readParam(params, 'q')
  const role = readParam(params, 'role')

  let query = supabase
    .from('profiles')
    .select('id, full_name, username, email, phone, job_title, is_active, last_login_at, roles!inner(code, name_ar)')
    .is('deleted_at', null)
    .eq('is_active', true)

  if (term) query = query.or(orIlike(['full_name', 'job_title', 'email', 'phone'], term))
  if (role) query = query.eq('roles.code', role)

  const [{ data }, rolesRes, casesRes] = await Promise.all([
    query.order('full_name'),
    supabase.from('roles').select('code, name_ar').order('created_at'),
    supabase.from('cases').select('responsible_lawyer_id').is('deleted_at', null)
      .not('status', 'in', '("closed","archived")').limit(10000),
  ])

  const staff = (data ?? []) as unknown as {
    id: string; full_name: string; username: string; email: string
    phone: string | null; job_title: string | null; is_active: boolean
    last_login_at: string | null; roles: { code: string; name_ar: string } | null
  }[]

  // عدد القضايا المفتوحة لكل محامٍ — مؤشّر سريع على حِمل العمل
  const caseLoad = new Map<string, number>()
  for (const row of casesRes.data ?? []) {
    if (!row.responsible_lawyer_id) continue
    caseLoad.set(row.responsible_lawyer_id, (caseLoad.get(row.responsible_lawyer_id) ?? 0) + 1)
  }

  return (
    <>
      <PageHeader title="المحامون والموظفون" description={`${staff.length} عضوًا في فريق المكتب`}>
        <PrintButton />
        {user.permissions.can('users', 'create') ? (
          <Button asChild>
            <Link href="/users/new">
              <UserPlus className="size-4" />
              إضافة عضو
            </Link>
          </Button>
        ) : null}
      </PageHeader>

      <FilterBar
        searchPlaceholder="ابحث بالاسم أو المسمّى الوظيفي..."
        filters={[
          {
            name: 'role', label: 'الدور',
            options: (rolesRes.data ?? []).map((r) => ({ value: r.code, label: r.name_ar })),
          },
        ]}
      />

      {staff.length === 0 ? (
        <EmptyState icon="UserCog" title="لا يوجد أعضاء مطابقون" />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((member) => {
            const load = caseLoad.get(member.id) ?? 0
            return (
              <li key={member.id}>
                <Card className="h-full">
                  <CardContent className="pt-5">
                    <div className="mb-3 flex items-start gap-3">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-navy-100 text-sm font-semibold text-navy-800 dark:bg-navy-800 dark:text-navy-200">
                        {initials(member.full_name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{member.full_name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {member.job_title ?? member.roles?.name_ar ?? '—'}
                        </span>
                      </span>
                    </div>

                    <Badge variant="gold" className="mb-3">
                      {member.roles?.name_ar ?? '—'}
                    </Badge>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p className="flex items-center gap-1.5">
                        <Mail className="size-3 shrink-0" />
                        <span dir="ltr" className="truncate">{member.email}</span>
                      </p>
                      {member.phone ? (
                        <p className="flex items-center gap-1.5">
                          <Phone className="size-3 shrink-0" />
                          <span dir="ltr" className="tabular">{member.phone}</span>
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
                      <span className="text-muted-foreground">
                        {load > 0 ? `${load} قضية مفتوحة` : 'لا قضايا مسندة'}
                      </span>
                      <span className="text-muted-foreground">
                        {member.last_login_at ? timeAgo(member.last_login_at) : 'لم يدخل بعد'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
