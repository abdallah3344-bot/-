'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import { saveExpenseAction } from '../actions'
import type { ActionResult } from '@/modules/auth/actions'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { FormField, FormError } from '@/components/shared/form-field'

const NONE = '__none__'
const initialState: ActionResult = { ok: true }

export type ExpenseOptions = {
  categories: { id: string; name_ar: string }[]
  cases: { id: string; title: string; internal_no: string }[]
  clients: { id: string; name: string }[]
  accounts: { id: string; name: string }[]
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  options: ExpenseOptions
  defaults?: Record<string, string | null> | null
}

export function ExpenseDialog({ open, onOpenChange, options, defaults }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(saveExpenseAction, initialState)

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
          <DialogTitle>{defaults?.id ? 'تعديل المصروف' : 'تسجيل مصروف'}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-4" noValidate>
          {defaults?.id ? <input type="hidden" name="id" value={defaults.id} /> : null}
          <FormError message={!state.ok && !state.fieldErrors ? state.error : null} />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="categoryId" label="نوع المصروف" error={err('categoryId')}>
              <Select name="categoryId" defaultValue={defaults?.categoryId ?? NONE}>
                <SelectTrigger id="categoryId"><SelectValue placeholder="غير مصنّف" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>غير مصنّف</SelectItem>
                  {options.categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>
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

            <FormField name="caseId" label="القضية" error={err('caseId')}>
              <Select name="caseId" defaultValue={defaults?.caseId ?? NONE}>
                <SelectTrigger id="caseId"><SelectValue placeholder="غير مرتبط بقضية" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>غير مرتبط بقضية</SelectItem>
                  {options.cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title} — {c.internal_no}</SelectItem>
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

            <FormField name="spentAt" label="تاريخ الصرف" required error={err('spentAt')}>
              <Input id="spentAt" name="spentAt" type="date"
                     defaultValue={defaults?.spentAt ?? new Date().toISOString().slice(0, 10)} />
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

            <FormField name="receiptRef" label="رقم السند / المرجع" error={err('receiptRef')}>
              <Input id="receiptRef" name="receiptRef" dir="ltr" className="text-start"
                     defaultValue={defaults?.receiptRef ?? ''} />
            </FormField>

            <div className="space-y-2">
              <Label htmlFor="isBillable">قابل للتحصيل من العميل</Label>
              <div className="flex h-10 items-center gap-3">
                <Switch id="isBillable" name="isBillable"
                        defaultChecked={defaults?.isBillable !== 'false'} />
                <span className="text-sm text-muted-foreground">
                  يُضاف إلى كشف حساب العميل
                </span>
              </div>
            </div>

            <FormField name="description" label="البيان" error={err('description')}
                       className="sm:col-span-2">
              <Textarea id="description" name="description" rows={2}
                        defaultValue={defaults?.description ?? ''}
                        placeholder="مثال: رسوم رفع دعوى أمام المحكمة التجارية" />
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
