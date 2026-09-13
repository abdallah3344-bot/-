'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, ScanText, Check, Info, TriangleAlert } from 'lucide-react'
import {
  runExtractionAction, approveExtractionAction, getExtractionAction,
} from '../actions'
import type { ExtractedFields } from '../provider'
import type { ActionResult } from '@/modules/auth/actions'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { FormField, FormError } from '@/components/shared/form-field'
import { Badge } from '@/components/ui/badge'

const NONE = '__none__'
const initialState: ActionResult = { ok: true }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: {
    id: string
    name: string
    ocr_status: string
    case_id: string | null
    client_id: string | null
    category_id: string | null
    doc_date: string | null
    description: string | null
  }
  options: {
    cases: { id: string; title: string; internal_no: string }[]
    clients: { id: string; name: string }[]
    categories: { id: string; name_ar: string }[]
  }
  ocrConfigured: boolean
  providerName: string
}

export function ExtractionReview({
  open, onOpenChange, document, options, ocrConfigured, providerName,
}: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(approveExtractionAction, initialState)
  const [fields, setFields] = useState<ExtractedFields | null>(null)
  const [extracting, startExtraction] = useTransition()

  useEffect(() => {
    if (!open) return
    getExtractionAction(document.id).then((result) => {
      if (result.ok) setFields(result.fields ?? null)
    })
  }, [open, document.id])

  useEffect(() => {
    if (state.ok && state.message) {
      toast.success(state.message)
      onOpenChange(false)
      router.refresh()
    }
  }, [state, onOpenChange, router])

  function extract() {
    startExtraction(async () => {
      const result = await runExtractionAction(document.id)
      if (result.ok) {
        toast.success(result.message ?? 'تم')
        const next = await getExtractionAction(document.id)
        if (next.ok) setFields(next.fields ?? null)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  const hasExtraction = fields && Object.keys(fields).length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>مراجعة بيانات المستند</DialogTitle>
          <DialogDescription>{document.name}</DialogDescription>
        </DialogHeader>

        {/* حالة مزوّد الاستخراج */}
        {!ocrConfigured ? (
          <div className="flex items-start gap-2.5 rounded-[var(--radius-app)] border border-border bg-surface-muted p-3 text-sm">
            <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="space-y-1">
              <p>
                <strong>الاستخراج التلقائي غير مفعّل.</strong> النظام جاهز بنيويًا
                لاستقبال مزوّد OCR، ويمكنك الآن إدخال البيانات يدويًا واعتمادها.
              </p>
              <p className="text-xs text-muted-foreground">
                لتفعيل الميزة يُنفَّذ عقد المزوّد في <code>src/modules/ocr/provider.ts</code>،
                ولا يحتاج باقي النظام لأي تغيير.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-[var(--radius-app)] border border-border p-3">
            <span className="text-sm">
              مزوّد الاستخراج: <strong>{providerName}</strong>
            </span>
            <Button size="sm" variant="outline" onClick={extract} disabled={extracting}>
              {extracting ? <Loader2 className="size-4 animate-spin" /> : <ScanText className="size-4" />}
              تشغيل الاستخراج
            </Button>
          </div>
        )}

        {/* الحقول المستخرجة — للاسترشاد لا للاعتماد التلقائي */}
        {hasExtraction ? (
          <div className="space-y-2 rounded-[var(--radius-app)] border border-gold-300 bg-gold-50/50 p-3 dark:border-gold-800 dark:bg-gold-900/20">
            <p className="flex items-center gap-2 text-sm font-medium">
              <TriangleAlert className="size-4 text-gold-700 dark:text-gold-400" />
              بيانات مستخرجة آليًا — تحقّق منها قبل الاعتماد
            </p>
            <dl className="grid gap-2 text-xs sm:grid-cols-2">
              {fields?.caseNumber ? (
                <Field label="رقم القضية" value={fields.caseNumber} />
              ) : null}
              {fields?.courtName ? <Field label="المحكمة" value={fields.courtName} /> : null}
              {fields?.documentDate ? <Field label="التاريخ" value={fields.documentDate} /> : null}
              {fields?.documentType ? <Field label="نوع المستند" value={fields.documentType} /> : null}
              {fields?.parties?.length ? (
                <Field label="الأطراف" value={fields.parties.join('، ')} />
              ) : null}
              {fields?.confidence !== undefined ? (
                <div>
                  <dt className="text-muted-foreground">درجة الثقة</dt>
                  <dd>
                    <Badge variant={fields.confidence >= 0.8 ? 'success' : 'warning'}>
                      {Math.round(fields.confidence * 100)}%
                    </Badge>
                  </dd>
                </div>
              ) : null}
            </dl>
            <p className="text-xs text-muted-foreground">
              هذه البيانات وصفية فقط ولا تُستخدم في أي قرار قانوني. الربط بالقضية
              لا يتم إلا بعد اعتمادك أدناه.
            </p>
          </div>
        ) : null}

        <form action={formAction} className="space-y-4" noValidate>
          <input type="hidden" name="documentId" value={document.id} />
          <FormError message={!state.ok ? state.error : null} />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="caseId" label="ربط بالقضية">
              <Select name="caseId" defaultValue={document.case_id ?? NONE}>
                <SelectTrigger id="caseId"><SelectValue placeholder="غير مرتبط" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>غير مرتبط</SelectItem>
                  {options.cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title} — {c.internal_no}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="clientId" label="ربط بالعميل">
              <Select name="clientId" defaultValue={document.client_id ?? NONE}>
                <SelectTrigger id="clientId"><SelectValue placeholder="غير مرتبط" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>غير مرتبط</SelectItem>
                  {options.clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="categoryId" label="التصنيف">
              <Select name="categoryId" defaultValue={document.category_id ?? NONE}>
                <SelectTrigger id="categoryId"><SelectValue placeholder="غير مصنّف" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>غير مصنّف</SelectItem>
                  {options.categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="docDate" label="تاريخ المستند">
              <Input id="docDate" name="docDate" type="date"
                     defaultValue={document.doc_date ?? fields?.documentDate ?? ''} />
            </FormField>

            <FormField name="description" label="الوصف" className="sm:col-span-2">
              <Textarea id="description" name="description" rows={2}
                        defaultValue={document.description ?? ''} />
            </FormField>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              اعتماد وربط المستند
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}
                    disabled={pending}>
              إلغاء
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}
