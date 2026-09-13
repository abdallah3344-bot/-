'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import { savePoaAction } from '../actions'
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
import { POA_TYPES, POA_TYPE_LABELS, POA_STATUSES, POA_STATUS_LABELS } from '@/lib/constants/enums'

const NONE = '__none__'
const initialState: ActionResult = { ok: true }

export type LegalDocOptions = {
  clients: { id: string; name: string }[]
  cases: { id: string; title: string; internal_no: string }[]
  lawyers: { id: string; full_name: string }[]
  documents: { id: string; name: string }[]
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  options: LegalDocOptions
  defaults?: Record<string, string | null> | null
}

export function PoaDialog({ open, onOpenChange, options, defaults }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(savePoaAction, initialState)

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
          <DialogTitle>{defaults?.id ? 'تعديل الوكالة' : 'إضافة وكالة'}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-4" noValidate>
          {defaults?.id ? <input type="hidden" name="id" value={defaults.id} /> : null}
          <FormError message={!state.ok ? state.error : null} />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="clientId" label="العميل" required error={err('clientId')}>
              <Select name="clientId" defaultValue={defaults?.clientId ?? NONE}>
                <SelectTrigger id="clientId" aria-invalid={Boolean(err('clientId'))}>
                  <SelectValue placeholder="اختر العميل" />
                </SelectTrigger>
                <SelectContent>
                  {options.clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="caseId" label="القضية" error={err('caseId')}>
              <Select name="caseId" defaultValue={defaults?.caseId ?? NONE}>
                <SelectTrigger id="caseId"><SelectValue placeholder="غير مرتبطة بقضية" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>غير مرتبطة بقضية</SelectItem>
                  {options.cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title} — {c.internal_no}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="poaType" label="نوع الوكالة" required error={err('poaType')}>
              <Select name="poaType" defaultValue={defaults?.poaType ?? 'general'}>
                <SelectTrigger id="poaType"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POA_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{POA_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="status" label="الحالة" required error={err('status')}>
              <Select name="status" defaultValue={defaults?.status ?? 'active'}>
                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POA_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{POA_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="issuedAt" label="تاريخ الوكالة" required error={err('issuedAt')}>
              <Input id="issuedAt" name="issuedAt" type="date"
                     defaultValue={defaults?.issuedAt ?? new Date().toISOString().slice(0, 10)}
                     aria-invalid={Boolean(err('issuedAt'))} />
            </FormField>

            <FormField name="expiresAt" label="تاريخ الانتهاء" error={err('expiresAt')}
                       hint="سيصلك تنبيه قبل الانتهاء بثلاثين يومًا">
              <Input id="expiresAt" name="expiresAt" type="date"
                     defaultValue={defaults?.expiresAt ?? ''}
                     aria-invalid={Boolean(err('expiresAt'))} />
            </FormField>

            <FormField name="lawyerId" label="المحامي الوكيل" error={err('lawyerId')}>
              <Select name="lawyerId" defaultValue={defaults?.lawyerId ?? NONE}>
                <SelectTrigger id="lawyerId"><SelectValue placeholder="غير محدّد" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>غير محدّد</SelectItem>
                  {options.lawyers.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="documentId" label="المستند المرفق" error={err('documentId')}>
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

            <FormField name="notes" label="ملاحظات" error={err('notes')} className="sm:col-span-2">
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
