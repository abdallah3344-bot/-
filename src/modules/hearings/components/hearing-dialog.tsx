'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import { createHearingAction, updateHearingAction } from '../actions'
import type { ActionResult } from '@/modules/auth/actions'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { FormField, FormError } from '@/components/shared/form-field'
import {
  HEARING_TYPES, HEARING_TYPE_LABELS, HEARING_STATUSES, HEARING_STATUS_LABELS,
} from '@/lib/constants/enums'

const NONE = '__none__'
const initialState: ActionResult = { ok: true }

export type HearingOptions = {
  cases: { id: string; title: string; internal_no: string }[]
  courts: { id: string; name_ar: string }[]
  chambers: { id: string; name_ar: string; court_id: string }[]
  judges: { id: string; full_name: string; court_id: string | null }[]
  lawyers: { id: string; full_name: string }[]
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  options: HearingOptions
  defaults?: Record<string, string | null> | null
  lockedCaseId?: string
}

export function HearingDialog({ open, onOpenChange, options, defaults, lockedCaseId }: Props) {
  const router = useRouter()
  const isEdit = Boolean(defaults?.id)
  const action = isEdit ? updateHearingAction : createHearingAction
  const [state, formAction, pending] = useActionState(action, initialState)
  const [courtId, setCourtId] = useState(defaults?.courtId ?? NONE)

  useEffect(() => setCourtId(defaults?.courtId ?? NONE), [defaults])

  useEffect(() => {
    if (state.ok && state.message) {
      toast.success(state.message)
      onOpenChange(false)
      router.refresh()
    }
  }, [state, onOpenChange, router])

  const err = (name: string) => (!state.ok ? state.fieldErrors?.[name] : undefined)
  const chambers = options.chambers.filter((c) => c.court_id === courtId)
  const judges = options.judges.filter((j) => !j.court_id || j.court_id === courtId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'تعديل الجلسة' : 'إضافة جلسة'}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-4" noValidate>
          {defaults?.id ? <input type="hidden" name="id" value={defaults.id} /> : null}
          <FormError message={!state.ok ? state.error : null} />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="caseId" label="القضية" required error={err('caseId')}
                       className="sm:col-span-2">
              <Select name="caseId" defaultValue={defaults?.caseId ?? lockedCaseId ?? NONE}
                      disabled={Boolean(lockedCaseId)}>
                <SelectTrigger id="caseId" aria-invalid={Boolean(err('caseId'))}>
                  <SelectValue placeholder="اختر القضية" />
                </SelectTrigger>
                <SelectContent>
                  {options.cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title} — {c.internal_no}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="hearingDate" label="تاريخ الجلسة" required error={err('hearingDate')}>
              <Input id="hearingDate" name="hearingDate" type="date"
                     defaultValue={defaults?.hearingDate ?? ''}
                     aria-invalid={Boolean(err('hearingDate'))} />
            </FormField>

            <FormField name="hearingTime" label="الوقت" error={err('hearingTime')}>
              <Input id="hearingTime" name="hearingTime" type="time"
                     defaultValue={defaults?.hearingTime?.slice(0, 5) ?? ''} />
            </FormField>

            <FormField name="courtId" label="المحكمة" error={err('courtId')}>
              <Select name="courtId" value={courtId} onValueChange={setCourtId}>
                <SelectTrigger id="courtId"><SelectValue placeholder="غير محدّدة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>غير محدّدة</SelectItem>
                  {options.courts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="chamberId" label="الدائرة" error={err('chamberId')}>
              <Select name="chamberId" defaultValue={defaults?.chamberId ?? NONE}
                      disabled={courtId === NONE || chambers.length === 0}>
                <SelectTrigger id="chamberId"><SelectValue placeholder="غير محدّدة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>غير محدّدة</SelectItem>
                  {chambers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="room" label="القاعة" error={err('room')}>
              <Input id="room" name="room" defaultValue={defaults?.room ?? ''} />
            </FormField>

            <FormField name="judgeId" label="القاضي" error={err('judgeId')}>
              <Select name="judgeId" defaultValue={defaults?.judgeId ?? NONE}>
                <SelectTrigger id="judgeId"><SelectValue placeholder="غير محدّد" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>غير محدّد</SelectItem>
                  {judges.map((j) => (
                    <SelectItem key={j.id} value={j.id}>{j.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="assignedLawyerId" label="المحامي المكلّف"
                       error={err('assignedLawyerId')}>
              <Select name="assignedLawyerId" defaultValue={defaults?.assignedLawyerId ?? NONE}>
                <SelectTrigger id="assignedLawyerId">
                  <SelectValue placeholder="غير محدّد" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>غير محدّد</SelectItem>
                  {options.lawyers.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="hearingType" label="نوع الجلسة" required error={err('hearingType')}>
              <Select name="hearingType" defaultValue={defaults?.hearingType ?? 'session'}>
                <SelectTrigger id="hearingType"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HEARING_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{HEARING_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="status" label="الحالة" required error={err('status')}>
              <Select name="status" defaultValue={defaults?.status ?? 'scheduled'}>
                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HEARING_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{HEARING_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="requiredAction" label="المطلوب في الجلسة"
                       error={err('requiredAction')} className="sm:col-span-2">
              <Textarea id="requiredAction" name="requiredAction" rows={2}
                        defaultValue={defaults?.requiredAction ?? ''}
                        placeholder="مثال: تقديم مذكرة جوابية ومستندات الملكية" />
            </FormField>

            <FormField name="result" label="نتيجة الجلسة" error={err('result')}>
              <Textarea id="result" name="result" rows={2} defaultValue={defaults?.result ?? ''} />
            </FormField>

            <FormField name="decision" label="القرار" error={err('decision')}>
              <Textarea id="decision" name="decision" rows={2}
                        defaultValue={defaults?.decision ?? ''} />
            </FormField>

            <FormField name="nextHearingDate" label="موعد الجلسة القادمة"
                       error={err('nextHearingDate')}>
              <Input id="nextHearingDate" name="nextHearingDate" type="date"
                     defaultValue={defaults?.nextHearingDate ?? ''}
                     aria-invalid={Boolean(err('nextHearingDate'))} />
            </FormField>

            <FormField name="notes" label="ملاحظات" error={err('notes')}>
              <Textarea id="notes" name="notes" rows={2} defaultValue={defaults?.notes ?? ''} />
            </FormField>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              حفظ
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
