import { MonitorSmartphone, CheckCircle2, Clock } from 'lucide-react'
import type { LicenseDevices } from '../service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, timeAgo } from '@/lib/utils'

/**
 * الأجهزة المرتبطة بترخيص المكتب — يراها المكتب ليطمئن أن لا جهاز
 * غريبًا يستعمل ترخيصه. الإضافة والإزالة من لوحة التراخيص لدى المطوّر.
 */
export function LicenseDevicesCard({ data }: { data: LicenseDevices | null }) {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MonitorSmartphone className="size-4" /> الأجهزة المرتبطة بالترخيص
          </CardTitle>
          <CardDescription>تظهر القائمة بعد اعتماد هذا الجهاز على ترخيص المكتب.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const pct = Math.min(100, Math.round((data.used / Math.max(1, data.maxDevices)) * 100))
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MonitorSmartphone className="size-4" /> الأجهزة المرتبطة بالترخيص
          <Badge variant={data.used >= data.maxDevices ? 'warning' : 'success'} className="ms-1 tabular-nums">
            {data.used} من {data.maxDevices}
          </Badge>
        </CardTitle>
        <CardDescription>
          كل حاسوب أو جوال يدخل منه موظفو المكتب يُسجَّل هنا برقم ثابت. الجهاز الجديد لا يعمل
          إلا بعد موافقة مكتب البرمجيات، ولإزالة جهاز أو زيادة العدد تواصل معه.
        </CardDescription>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-gold-500" style={{ width: `${pct}%` }} />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {data.devices.map((d) => (
            <li key={d.code} className="flex items-center gap-3 px-6 py-3 text-sm">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted font-bold tabular-nums">
                {d.no ?? '—'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 font-medium">
                  <span>{d.name ?? `جهاز رقم ${d.no ?? ''}`}</span>
                  {d.is_current ? <Badge variant="gold">هذا الجهاز</Badge> : null}
                  {d.status === 'pending' ? (
                    <Badge variant="warning"><Clock className="size-3" /> بانتظار الموافقة</Badge>
                  ) : (
                    <Badge variant="success"><CheckCircle2 className="size-3" /> معتمد</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  رمز الجهاز <span dir="ltr" className="font-mono">{d.code}</span>
                  {' · '}أول استخدام {formatDateTime(d.first_seen_at)}
                  {d.last_seen_at ? <> · آخر استخدام {timeAgo(d.last_seen_at)}</> : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
