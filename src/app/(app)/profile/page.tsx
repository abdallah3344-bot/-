import type { Metadata } from 'next'
import Link from 'next/link'
import { KeyRound } from 'lucide-react'
import { requireAuth } from '@/lib/auth/session'
import { PageHeader } from '@/components/shared/page-header'
import { ProfileForm } from '@/modules/users/components/profile-form'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { MODULE_LABELS, type Module } from '@/lib/auth/permissions'

export const metadata: Metadata = { title: 'الملف الشخصي' }

export default async function ProfilePage() {
  const user = await requireAuth()

  // تجميع الصلاحيات حسب الوحدة لعرضها للمستخدم
  const byModule = new Map<string, number>()
  for (const code of user.permissions.toArray()) {
    const [moduleName] = code.split('.')
    byModule.set(moduleName, (byModule.get(moduleName) ?? 0) + 1)
  }

  return (
    <>
      <PageHeader title="الملف الشخصي" description="بياناتك الشخصية وصلاحياتك في النظام">
        <Button variant="outline" asChild>
          <Link href="/profile/password">
            <KeyRound className="size-4" />
            تغيير كلمة المرور
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProfileForm
            defaults={{
              fullName: user.fullName,
              phone: user.phone,
              jobTitle: user.jobTitle,
            }}
            username={user.username}
            email={user.email}
          />
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>دورك وصلاحياتك</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-1.5 text-xs text-muted-foreground">الدور</p>
              <Badge variant="gold">{user.roleName}</Badge>
            </div>

            <div>
              <p className="mb-2 text-xs text-muted-foreground">
                الوحدات المتاحة لك ({byModule.size})
              </p>
              <ul className="space-y-1.5">
                {[...byModule.entries()].map(([moduleName, count]) => (
                  <li key={moduleName} className="flex items-center justify-between text-sm">
                    <span>{MODULE_LABELS[moduleName as Module] ?? moduleName}</span>
                    <span className="text-xs text-muted-foreground tabular">{count} صلاحية</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="border-t border-border pt-3 text-xs text-muted-foreground">
              لتعديل صلاحياتك راجع مدير النظام.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
