'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import { saveAccountAction } from '../actions'
import type { ActionResult } from '@/modules/auth/actions'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { FormField, FormError } from '@/components/shared/form-field'

const initialState: ActionResult = { ok: true }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaults?: Record<string, string | null> | null
}

export function AccountDialog({ open, onOpenChange, defaults }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(saveAccountAction, initialState)
  const [type, setType] = useState(defaults?.accountType ?? 'cash')

  useEffect(() => setType(defaults?.accountType ?? 'cash'), [defaults])

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{defaults?.id ? 'تعديل الحساب' : 'إضافة حساب'}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-4" noValidate>
          {defaults?.id ? <input type="hidden" name="id" value={defaults.id} /> : null}
          <FormError message={!state.ok ? state.error : null} />

          <FormField name="name" label="اسم الحساب" required error={err('name')}>
            <Input id="name" name="name" defaultValue={defaults?.name ?? ''}
                   placeholder="مثال: الصندوق النقدي" />
          </FormField>

          <FormField name="accountType" label="نوع الحساب" required error={err('accountType')}>
            <Select name="accountType" value={type} onValueChange={setType}>
              <SelectTrigger id="accountType"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">صندوق نقدي</SelectItem>
                <SelectItem value="bank">حساب بنكي</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          {type === 'bank' ? (
            <>
              <FormField name="bankName" label="اسم البنك" error={err('bankName')}>
                <Input id="bankName" name="bankName" defaultValue={defaults?.bankName ?? ''} />
              </FormField>

              <FormField name="accountNumber" label="رقم الحساب" error={err('accountNumber')}>
                <Input id="accountNumber" name="accountNumber" dir="ltr" className="text-start"
                       defaultValue={defaults?.accountNumber ?? ''} />
              </FormField>

              <FormField name="iban" label="الآيبان" error={err('iban')}>
                <Input id="iban" name="iban" dir="ltr" className="text-start"
                       defaultValue={defaults?.iban ?? ''} placeholder="SA00 0000 0000 0000 0000 0000" />
              </FormField>
            </>
          ) : null}

          <FormField name="openingBalance" label="الرصيد الافتتاحي" error={err('openingBalance')}>
            <Input id="openingBalance" name="openingBalance" type="number" step="0.01" min="0"
                   dir="ltr" className="text-start"
                   defaultValue={defaults?.openingBalance ?? '0'} />
          </FormField>

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
