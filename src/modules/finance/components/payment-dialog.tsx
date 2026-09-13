'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import { savePaymentAction } from '../actions'
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
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '@/lib/constants/enums'

const NONE = '__none__'
const initialState: ActionResult = { ok: true }

export type PaymentOptions = {
  clients: { id: string; name: string }[]
  cases: { id: string; title: string; internal_no: string }[]
  invoices: { id: string; invoice_no: string; total: number; paid_amount: number }[]
  accounts: { id: string; name: string }[]
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  options: PaymentOptions
  defaults?: Record<string, string | null> | null
}

export function PaymentDialog({ open, onOpenChange, options, defaults }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(savePaymentAction, initialState)

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
          <DialogTitle>{defaults?.id ? 'تعديل الدفعة' : 'تسجيل دفعة'}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-4" noValidate>
          {defaults?.id ? <input type="hidden" name="id" value={defaults.id} /> : null}
          <FormError message={!state.ok && !state.fieldErrors ? state.error : null} />

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

            <FormField name="invoiceId" label="الفاتورة" error={err('invoiceId')}
                       hint="عند الربط بفاتورة، لا يُقبل مبلغ يتجاوز المتبقي عليها">
              <Select name="invoiceId" defaultValue={defaults?.invoiceId ?? NONE}>
                <SelectTrigger id="invoiceId"><SelectValue placeholder="بلا فاتورة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>بلا فاتورة</SelectItem>
                  {options.invoices.map((i) => {
                    const remaining = Number(i.total) - Number(i.paid_amount)
                    return (
                      <SelectItem key={i.id} value={i.id}>
                        {i.invoice_no} — متبقٍ {remaining.toFixed(2)}
                      </SelectItem>
                    )
                  })}
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

            <FormField name="amount" label="المبلغ" required error={err('amount')}>
              <Input id="amount" name="amount" type="number" step="0.01" min="0.01"
                     dir="ltr" className="text-start"
                     defaultValue={defaults?.amount ?? ''} placeholder="0.00"
                     aria-invalid={Boolean(err('amount'))} />
            </FormField>

            <FormField name="method" label="طريقة الدفع" required error={err('method')}>
              <Select name="method" defaultValue={defaults?.method ?? 'cash'}>
                <SelectTrigger id="method"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="referenceNo" label="رقم الشيك / المرجع" error={err('referenceNo')}>
              <Input id="referenceNo" name="referenceNo" dir="ltr" className="text-start"
                     defaultValue={defaults?.referenceNo ?? ''} />
            </FormField>

            <FormField name="paidAt" label="تاريخ القبض" required error={err('paidAt')}>
              <Input id="paidAt" name="paidAt" type="date"
                     defaultValue={defaults?.paidAt ?? new Date().toISOString().slice(0, 10)} />
            </FormField>

            <FormField name="accountId" label="الحساب" error={err('accountId')}>
              <Select name="accountId" defaultValue={defaults?.accountId ?? NONE}>
                <SelectTrigger id="accountId"><SelectValue placeholder="غير محدّد" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>غير محدّد</SelectItem>
                  {options.accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
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
