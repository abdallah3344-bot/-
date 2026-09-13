'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import { saveCaseFeeAction } from '../actions'
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
import { formatMoney } from '@/lib/utils'

const NONE = '__none__'
const initialState: ActionResult = { ok: true }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  cases: { id: string; title: string; internal_no: string }[]
  currencySymbol: string
  defaults?: Record<string, string | null> | null
  lockedCaseId?: string
}

export function FeeDialog({
  open, onOpenChange, cases, currencySymbol, defaults, lockedCaseId,
}: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(saveCaseFeeAction, initialState)

  const [total, setTotal] = useState(defaults?.totalAmount ?? '')
  const [advance, setAdvance] = useState(defaults?.advanceAmount ?? '0')
  const [count, setCount] = useState(defaults?.installmentsCount ?? '0')

  useEffect(() => {
    if (state.ok && state.message) {
      toast.success(state.message)
      onOpenChange(false)
      router.refresh()
    }
  }, [state, onOpenChange, router])

  // معاينة القسط قبل الحفظ — الحساب النهائي يتم في الخادم
  const preview = useMemo(() => {
    const t = Number(total) || 0
    const a = Number(advance) || 0
    const n = Number(count) || 0
    const remaining = Math.max(0, t - a)
    return {
      remaining,
      perInstallment: n > 0 ? Math.round((remaining / n) * 100) / 100 : 0,
    }
  }, [total, advance, count])

  const err = (name: string) => (!state.ok ? state.fieldErrors?.[name] : undefined)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>أتعاب القضية</DialogTitle>
          <DialogDescription>
            تحديد الأتعاب وتقسيطها. الحفظ يُعيد توليد جدول الأقساط بالكامل.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4" noValidate>
          <FormError message={!state.ok && !state.fieldErrors ? state.error : null} />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="caseId" label="القضية" required error={err('caseId')}
                       className="sm:col-span-2">
              <Select name="caseId" defaultValue={defaults?.caseId ?? lockedCaseId ?? NONE}
                      disabled={Boolean(lockedCaseId)}>
                <SelectTrigger id="caseId" aria-invalid={Boolean(err('caseId'))}>
                  <SelectValue placeholder="اختر القضية" />
                </SelectTrigger>
                <SelectContent>
                  {cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title} — {c.internal_no}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="totalAmount" label="قيمة الأتعاب" required error={err('totalAmount')}>
              <Input id="totalAmount" name="totalAmount" type="number" step="0.01" min="0"
                     dir="ltr" className="text-start"
                     value={total} onChange={(e) => setTotal(e.target.value)}
                     placeholder="0.00" aria-invalid={Boolean(err('totalAmount'))} />
            </FormField>

            <FormField name="advanceAmount" label="الدفعة المقدمة" error={err('advanceAmount')}>
              <Input id="advanceAmount" name="advanceAmount" type="number" step="0.01" min="0"
                     dir="ltr" className="text-start"
                     value={advance} onChange={(e) => setAdvance(e.target.value)}
                     aria-invalid={Boolean(err('advanceAmount'))} />
            </FormField>

            <FormField name="installmentsCount" label="عدد الأقساط"
                       error={err('installmentsCount')}>
              <Input id="installmentsCount" name="installmentsCount" type="number" min="0" step="1"
                     dir="ltr" className="text-start"
                     value={count} onChange={(e) => setCount(e.target.value)} />
            </FormField>

            <FormField name="firstDueDate" label="تاريخ استحقاق أول قسط"
                       error={err('firstDueDate')}
                       hint="تُولَّد باقي الأقساط شهريًا بعده">
              <Input id="firstDueDate" name="firstDueDate" type="date"
                     defaultValue={defaults?.firstDueDate ?? ''} />
            </FormField>

            <dl className="sm:col-span-2 space-y-2 rounded-lg bg-surface-muted p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">المتبقي بعد الدفعة المقدمة</dt>
                <dd className="tabular font-medium">
                  {formatMoney(preview.remaining, currencySymbol)}
                </dd>
              </div>
              {Number(count) > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">قيمة القسط الواحد</dt>
                  <dd className="tabular font-medium">
                    {formatMoney(preview.perInstallment, currencySymbol)} × {count}
                  </dd>
                </div>
              ) : null}
            </dl>

            <FormField name="notes" label="ملاحظات" error={err('notes')} className="sm:col-span-2">
              <Textarea id="notes" name="notes" rows={2} defaultValue={defaults?.notes ?? ''} />
            </FormField>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              حفظ الأتعاب
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
