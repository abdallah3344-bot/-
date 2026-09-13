'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import { saveCorrespondenceAction } from '../actions'
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
  CORR_DIRECTIONS, CORR_DIRECTION_LABELS, CORR_PARTY_TYPES,
  CORR_PARTY_LABELS, CORR_STATUSES, CORR_STATUS_LABELS,
} from '@/lib/constants/enums'

const NONE = '__none__'
const initialState: ActionResult = { ok: true }

export type CorrOptions = {
  clients: { id: string; name: string }[]
  cases: { id: string; title: string; internal_no: string }[]
  staff: { id: string; full_name: string }[]
  documents: { id: string; name: string }[]
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  options: CorrOptions
  defaults?: Record<string, string | null> | null
}

export function CorrespondenceDialog({ open, onOpenChange, options, defaults }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(saveCorrespondenceAction, initialState)

  useEffect(() => {
    if (state.ok && state.message) {
      toast.success(state.message)
      onOpenChange(false)
      router.refresh()
    }
  }, [state, onOpenChange, router])

  const err = (name: string) => (!state.ok ? state.fieldErrors?.[name] : undefined)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{defaults?.id ? 'تعديل المراسلة' : 'تسجيل مراسلة'}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-4" noValidate>
          {defaults?.id ? <input type="hidden" name="id" value={defaults.id} /> : null}
          <FormError message={!state.ok && !state.fieldErrors ? state.error : null} />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="direction" label="النوع" required error={err('direction')}
                       hint="يُولَّد رقم مرجعي مستقل لكل من الصادر والوارد">
              <Select name="direction" defaultValue={defaults?.direction ?? 'outgoing'}>
                <SelectTrigger id="direction"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CORR_DIRECTIONS.map((d) => (
                    <SelectItem key={d} value={d}>{CORR_DIRECTION_LABELS[d]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="partyType" label="نوع الجهة" required error={err('partyType')}>
              <Select name="partyType" defaultValue={defaults?.partyType ?? 'client'}>
                <SelectTrigger id="partyType"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CORR_PARTY_TYPES.map((p) => (
                    <SelectItem key={p} value={p}>{CORR_PARTY_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="partyName" label="اسم الجهة" required error={err('partyName')}
                       className="sm:col-span-2">
              <Input id="partyName" name="partyName" defaultValue={defaults?.partyName ?? ''}
                     placeholder="مثال: محكمة الاستئناف — الدائرة التجارية الثانية"
                     aria-invalid={Boolean(err('partyName'))} />
            </FormField>

            <FormField name="subject" label="الموضوع" required error={err('subject')}
                       className="sm:col-span-2">
              <Input id="subject" name="subject" defaultValue={defaults?.subject ?? ''}
                     aria-invalid={Boolean(err('subject'))} />
            </FormField>

            <FormField name="corrDate" label="التاريخ" required error={err('corrDate')}>
              <Input id="corrDate" name="corrDate" type="date"
                     defaultValue={defaults?.corrDate ?? new Date().toISOString().slice(0, 10)} />
            </FormField>

            <FormField name="status" label="الحالة" required error={err('status')}>
              <Select name="status" defaultValue={defaults?.status ?? 'open'}>
                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CORR_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{CORR_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="clientId" label="العميل" error={err('clientId')}>
              <Select name="clientId" defaultValue={defaults?.clientId ?? NONE}>
                <SelectTrigger id="clientId"><SelectValue placeholder="غير محدّد" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>غير محدّد</SelectItem>
                  {options.clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="caseId" label="القضية" error={err('caseId')}>
              <Select name="caseId" defaultValue={defaults?.caseId ?? NONE}>
                <SelectTrigger id="caseId"><SelectValue placeholder="غير محدّدة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>غير محدّدة</SelectItem>
                  {options.cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title} — {c.internal_no}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="ownerId" label="المسؤول" error={err('ownerId')}>
              <Select name="ownerId" defaultValue={defaults?.ownerId ?? NONE}>
                <SelectTrigger id="ownerId"><SelectValue placeholder="غير محدّد" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>غير محدّد</SelectItem>
                  {options.staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="documentId" label="المرفق" error={err('documentId')}>
              <Select name="documentId" defaultValue={defaults?.documentId ?? NONE}>
                <SelectTrigger id="documentId"><SelectValue placeholder="بلا مرفق" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>بلا مرفق</SelectItem>
                  {options.documents.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="body" label="نص المراسلة" error={err('body')}
                       className="sm:col-span-2">
              <Textarea id="body" name="body" rows={4} defaultValue={defaults?.body ?? ''} />
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
