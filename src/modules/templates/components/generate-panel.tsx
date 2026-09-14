'use client'

import { useMemo, useState } from 'react'
import { FileText, FileType2, Printer, Download } from 'lucide-react'
import type { TemplateRow } from '../queries'
import { Button } from '@/components/ui/button'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

type Props = {
  templates: TemplateRow[]
  /** مصدر البيانات: قضية أو موكل */
  caseId?: string
  clientId?: string
}

/** اختيار قالب وتوليد المستند منه. */
export function GeneratePanel({ templates, caseId, clientId }: Props) {
  const [selected, setSelected] = useState<string>('')

  const usable = useMemo(
    () => templates.filter((t) =>
      caseId ? t.scope === 'case' || t.scope === 'general'
             : t.scope === 'client' || t.scope === 'general'),
    [templates, caseId],
  )

  const template = usable.find((t) => t.id === selected)
  const query = caseId ? `case=${caseId}` : clientId ? `client=${clientId}` : ''

  if (usable.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        لا توجد قوالب مناسبة بعد. تُضاف من «قوالب المستندات».
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-56 flex-1 space-y-2">
        <Label htmlFor="templateId">القالب</Label>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger id="templateId"><SelectValue placeholder="اختر قالبًا" /></SelectTrigger>
          <SelectContent>
            {usable.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {template?.body ? (
        <Button asChild>
          <a href={`/templates/${template.id}/preview?${query}`} target="_blank" rel="noreferrer">
            <Printer className="size-4" /> معاينة وطباعة
          </a>
        </Button>
      ) : null}

      {template?.file_path ? (
        <Button asChild variant={template.body ? 'outline' : 'default'}>
          <a href={`/api/templates/${template.id}/generate?${query}`}>
            <Download className="size-4" /> تنزيل Word معبّأ
          </a>
        </Button>
      ) : null}

      {template ? (
        <p className="w-full text-xs text-muted-foreground">
          {template.body && template.file_path
            ? <><FileText className="inline size-3" /> نصّ و<FileType2 className="inline size-3" /> ملف Word متاحان.</>
            : template.file_path
              ? 'قالب Word — يُنزَّل معبّأ بحقول القضية.'
              : 'قالب نصّي — يُعرض للطباعة أو الحفظ PDF.'}
          {' '}الحقول التي لا بيانات لها تظهر فراغًا معلَّمًا لتُكمَل بخط اليد أو بعد استكمال الملف.
        </p>
      ) : null}
    </div>
  )
}
