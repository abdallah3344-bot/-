import { redirect } from 'next/navigation'
import { ShieldAlert, ShieldCheck, Clock } from 'lucide-react'
import { requireAuth } from '@/lib/auth/session'
import { getLicenseStatus, getLicenseInputs } from '@/modules/license/service'
import { LICENSE_STATE_LABELS } from '@/modules/license/constants'
import {
  ActivateByKeyForm,
  RequestTrialForm,
} from '@/modules/license/components/activation-forms'
import { RefreshLicenseButton } from '@/modules/license/components/refresh-license-button'
import { LogoutButton } from '@/components/layout/logout-button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export const metadata = { title: 'تفعيل النظام' }

export default async function ActivationPage() {
  const user = await requireAuth()
  const status = await getLicenseStatus()

  // ترخيص سارٍ ⇒ لا معنى لبقاء المستخدم هنا.
  if (status.allowed && !status.degraded) redirect('/dashboard')

  const canActivate = user.permissions.can('settings', 'update')
  const inputs = await getLicenseInputs()
  const stateLabel = LICENSE_STATE_LABELS[status.state] ?? 'النظام غير مفعَّل'
  const waiting = status.state === 'trial_pending' || status.state === 'device_pending'

  return (
    <>
      <Card>
        <CardHeader className="items-center text-center">
          <div
            className={
              waiting
                ? 'mx-auto flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                : 'mx-auto flex size-12 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
            }
          >
            {waiting ? <Clock className="size-6" /> : <ShieldAlert className="size-6" />}
          </div>
          <CardTitle className="mt-3">{stateLabel}</CardTitle>
          <CardDescription data-license-message>
            {status.message ?? 'هذا النظام يحتاج ترخيصًا ساريًا من لوحة تراخيص المصري جروب.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <dl className="rounded-[var(--radius-app)] border bg-muted/40 p-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">معرّف هذه النسخة</dt>
              <dd className="font-mono text-xs" dir="ltr" data-device-id>
                {status.deviceId || inputs?.deviceId}
              </dd>
            </div>
            {inputs?.licenseKey ? (
              <div className="mt-2 flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">مفتاح الترخيص</dt>
                <dd className="font-mono text-xs" dir="ltr">{inputs.licenseKey}</dd>
              </div>
            ) : null}
          </dl>
          <p className="text-xs text-muted-foreground leading-relaxed">
            زوّد مكتب البرمجيات بمعرّف النسخة أعلاه عند طلب الترخيص أو الموافقة على الجهاز.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <RefreshLicenseButton label="تحقّق الآن" />
            <LogoutButton />
          </div>
        </CardContent>
      </Card>

      {canActivate ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">لديك مفتاح ترخيص</CardTitle>
              <CardDescription>أدخل المفتاح الذي زوّدك به مكتب البرمجيات.</CardDescription>
            </CardHeader>
            <CardContent>
              <ActivateByKeyForm defaultPhone={inputs?.phone} />
            </CardContent>
          </Card>

          {!inputs?.licenseKey ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">أو اطلب نسخة تجريبية</CardTitle>
                <CardDescription>
                  يصل الطلب إلى لوحة التراخيص، ويبدأ النظام فور الموافقة عليه.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RequestTrialForm defaultName={inputs?.clientName} />
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : (
        <Card>
          <CardContent className="flex items-start gap-3 py-6 text-sm text-muted-foreground">
            <ShieldCheck className="size-5 shrink-0 text-muted-foreground" />
            <p>
              التفعيل يحتاج صلاحية تعديل الإعدادات. راجع مدير المكتب لإتمام تفعيل النظام.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  )
}
