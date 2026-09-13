'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import { saveContractAction } from '../actions'
import type { LegalDocOptions } from './poa-dialog'
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
import { CONTRACT_STATUSES, CONTRACT_STATUS_LABELS } from '@/lib/constants/enums'

const NONE = '__none__'
const initialState: ActionResult = { ok: true }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  options: LegalDocOptions
  defaults?: Record<string, string | null> | null
}

export function ContractDialog({ open, onOpenChange, options, defaults }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(saveContractAction, initialState)

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
          <DialogTitle>{defaults?.id ? 'تعديل العقد' : 'إضافة عقد'}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-4" noValidate>
          {defaults?.id ? <input type="hidden" name="id" value={defaults.id} /> : null}
          <FormError message={!state.ok ? state.error : null} />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="title" label="اسم العقد" required error={err('title')}
                       className="sm:col-span-2">
              <Input id="title" name="title" defaultValue={defaults?.title ?? ''}
                     placeholder="مثال: عقد استشارات قانونية سنوي"
                     aria-invalid={Boolean(err('title'))} />
            </FormField>

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

            <FormField name="counterparty" label="الطرف الآخر" error={err('counterparty')}>
              <Input id="counterparty" name="counterparty"
                     defaultValue={defaults?.counterparty ?? ''} />
            </FormField>

            <FormField name="contractType" label="نوع العقد" error={err('contractType')}>
              <Input id="contractType" name="contractType"
                     defaultValue={defaults?.contractType ?? ''}
                     placeholder="مثال: استشارات، توريد، إيجار" />
            </FormField>

            <FormField name="value" label="قيمة العقد" error={err('value')}>
              <Input id="value" name="value" type="number" step="0.01" min="0"
                     dir="ltr" className="text-start"
                     defaultValue={defaults?.value ?? ''} placeholder="0.00" />
            </FormField>

            <FormField name="startDate" label="تاريخ البداية" error={err('startDate')}>
              <Input id="startDate" name="startDate" type="date"
                     defaultValue={defaults?.startDate ?? ''} />
            </FormField>

            <FormField name="endDate" label="تاريخ النهاية" error={err('endDate')}
                       hint="سيصلك تنبيه قبل الانتهاء بثلاثين يومًا">
              <Input id="endDate" name="endDate" type="date"
                     defaultValue={defaults?.endDate ?? ''}
                     aria-invalid={Boolean(err('endDate'))} />
            </FormField>

            <FormField name="lawyerId" label="المحامي المسؤول" error={err('lawyerId')}>
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

            <FormField name="status" label="الحالة" required error={err('status')}>
              <Select name="status" defaultValue={defaults?.status ?? 'active'}>
                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTRACT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{CONTRACT_STATUS_LABELS[s]}</SelectItem>
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
