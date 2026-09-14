import { Download, FileSpreadsheet } from 'lucide-react'
import type { SheetSection } from '../mizan'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

/**
 * ورقة بيانات القضية للإدخال في ميزان.
 * ليست تكاملًا رسميًا — نظام ميزان مغلق ولا صيغة استيراد منشورة له.
 */
export function MizanSheet({
  sections, caseId, canExport,
}: {
  sections: SheetSection[]
  caseId: string
  canExport: boolean
}) {
  return (
    <Card className="print-sheet">
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="size-4 text-muted-foreground" />
            ورقة بيانات القضية
          </CardTitle>
          <CardDescription>
            بيانات القضية مرتّبة في ورقة واحدة للنسخ عند الإدخال في ميزان
          </CardDescription>
        </div>

        {canExport ? (
          <div className="no-print flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <a href={`/api/cases/${caseId}/mizan?format=csv`}>
                <Download className="size-4" /> CSV
              </a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={`/api/cases/${caseId}/mizan?format=json`}>
                <Download className="size-4" /> JSON
              </a>
            </Button>
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-5">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {section.title}
            </p>
            <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              {section.rows.map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-4 border-b border-border pb-1.5">
                  <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
                  <dd className="min-w-0 text-end font-medium break-words">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}

        <p className="text-xs leading-relaxed text-muted-foreground">
          ليست تكاملًا رسميًا مع ميزان: النظام مغلق ولا صيغة استيراد منشورة له،
          فما هنا ترتيبٌ للنسخ اليدوي أو ملفّ لمن يريد نقله آليًا.
        </p>
      </CardContent>
    </Card>
  )
}
