import Link from 'next/link'
import { Users } from 'lucide-react'
import type { LicenseUsers } from '../service'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/**
 * الترخيص على المستخدمين: يدخل كل موظف من أي جهاز أو متصفح، والحد هو
 * عدد المستخدمين الفعّالين. والمستخدم الواحد مفتوح على جهازين معًا على الأكثر.
 */
export function LicenseUsersCard({ data }: { data: LicenseUsers | null }) {
  const max = data?.max ?? null
  const used = data?.used ?? 0
  const pct = max ? Math.min(100, Math.round((used / Math.max(1, max)) * 100)) : 0
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4" /> المستخدمون في الترخيص
          {max ? (
            <Badge variant={used >= max ? 'warning' : 'success'} className="ms-1 tabular-nums">
              {used} من {max}
            </Badge>
          ) : null}
        </CardTitle>
        <CardDescription className="leading-relaxed">
          الترخيص على عدد المستخدمين لا على الأجهزة: كل موظف يدخل باسم مستخدمه من أي حاسوب أو جوال
          أو متصفح دون انتظار موافقة. ويبقى المستخدم الواحد مفتوحًا على جهازين في الوقت نفسه؛ فإن دخل
          من جهاز ثالث خرج تلقائيًا من أقدمهما. المستخدم المعطَّل لا يُحسب من العدد. لزيادة العدد تواصل
          مع مكتب البرمجيات.
        </CardDescription>
        {max ? (
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gold-500" style={{ width: `${pct}%` }} />
          </div>
        ) : null}
        <Link href="/users" className="mt-2 inline-block text-sm text-primary hover:underline">إدارة المستخدمين</Link>
      </CardHeader>
    </Card>
  )
}
