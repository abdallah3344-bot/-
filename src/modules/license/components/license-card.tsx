import { ShieldCheck, ShieldAlert, WifiOff } from 'lucide-react'
import type { LicenseStatus } from '../service'
import { LICENSE_STATE_LABELS, LICENSE_TYPE_LABELS } from '../constants'
import { RefreshLicenseButton } from './refresh-license-button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('ar', { dateStyle: 'long' }).format(new Date(value))
}

/** بطاقة حالة الترخيص داخل الإعدادات. */
export function LicenseCard({ status }: { status: LicenseStatus }) {
  const healthy = status.allowed && !status.degraded

  const rows: Array<[string, string]> = [
    ['البرنامج في اللوحة', 'نظام إدارة مكتب المحاماة'],
    ['نوع الترخيص', status.licenseType
      ? LICENSE_TYPE_LABELS[status.licenseType] ?? status.licenseType
      : '—'],
    ['تاريخ الانتهاء', status.isLifetime ? 'دائم — بلا انتهاء' : formatDate(status.expiresAt)],
    ['المتبقي', status.isLifetime || status.daysRemaining === null
      ? '—'
      : `${status.daysRemaining} يومًا`],
    ['مفتاح الترخيص', status.licenseKey ?? '—'],
    ['معرّف هذه النسخة', status.deviceId || '—'],
  ]

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-base">
            {status.degraded ? (
              <WifiOff className="size-4 text-amber-600" />
            ) : healthy ? (
              <ShieldCheck className="size-4 text-emerald-600" />
            ) : (
              <ShieldAlert className="size-4 text-red-600" />
            )}
            الترخيص
            <Badge variant={healthy ? 'success' : status.degraded ? 'warning' : 'danger'}>
              {LICENSE_STATE_LABELS[status.state] ?? status.state}
            </Badge>
          </CardTitle>
          <CardDescription>
            مُدار من لوحة تراخيص المصري جروب — التجديد والأجهزة تُضبط من هناك.
          </CardDescription>
        </div>
        <RefreshLicenseButton />
      </CardHeader>

      <CardContent>
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 border-b pb-2">
              <dt className="text-muted-foreground">{label}</dt>
              <dd
                className={label.includes('مفتاح') || label.includes('معرّف')
                  ? 'font-mono text-xs truncate'
                  : 'font-medium'}
                dir={label.includes('مفتاح') || label.includes('معرّف') ? 'ltr' : undefined}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
