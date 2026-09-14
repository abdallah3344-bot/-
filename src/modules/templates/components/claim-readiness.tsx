import Link from 'next/link'
import { CheckCircle2, AlertCircle, MinusCircle, ExternalLink } from 'lucide-react'
import type { ClaimCheck } from '../claim-check'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

const ICON = {
  ok: <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />,
  missing: <AlertCircle className="size-4 shrink-0 text-red-600" />,
  not_applicable: <MinusCircle className="size-4 shrink-0 text-muted-foreground" />,
}

/**
 * جاهزية بيانات لائحة الدعوى.
 * يفحص اكتمال الحقول فقط — لا يراجع صياغة ولا يُقرّ صحّة لائحة.
 */
export function ClaimReadiness({ check }: { check: ClaimCheck }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          جاهزية بيانات لائحة الدعوى
          {check.complete
            ? <Badge variant="success">كل البنود المنطبقة مكتملة</Badge>
            : <Badge variant="danger">{check.missingCount} بند ناقص</Badge>}
        </CardTitle>
        <CardDescription>
          البيانات التي يوجب ذكرها قانون أصول المحاكمات المدنية والتجارية رقم (2)
          لسنة 2001 — المادة 52. راجع النص النافذ بعد تعديلات 2024.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-2">
        {check.items.map((item) => (
          <div
            key={item.key}
            data-claim-item={item.state}
            className="flex items-start gap-3 border-b border-border pb-2 last:border-0 last:pb-0"
          >
            {ICON[item.state]}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
            </div>
            {item.fixHref ? (
              <Link
                href={item.fixHref}
                className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-gold-700 hover:underline dark:text-gold-400"
              >
                استكمال <ExternalLink className="size-3" />
              </Link>
            ) : null}
          </div>
        ))}

        <p className="pt-3 text-xs leading-relaxed text-muted-foreground">
          هذا فحص اكتمال بيانات لا مراجعة قانونية: النظام يقول إن الحقل فارغ،
          ولا يقول إن اللائحة صحيحة أو مقبولة. الصياغة والمسؤولية على المحامي.
        </p>
      </CardContent>
    </Card>
  )
}
