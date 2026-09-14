'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Save, UserPlus } from 'lucide-react'
import { createClientAction, updateClientAction } from '../actions'
import type { ActionResult } from '@/modules/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { FormField, FormError } from '@/components/shared/form-field'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  CLIENT_TYPES, CLIENT_TYPE_LABELS, CLIENT_STATUSES, CLIENT_STATUS_LABELS,
} from '@/lib/constants/enums'

type Lawyer = { id: string; full_name: string }

type Props = {
  mode: 'create' | 'edit'
  lawyers: Lawyer[]
  defaults?: {
    id: string
    name: string
    clientType: string
    nationalId: string | null
    phone: string | null
    whatsapp: string | null
    email: string | null
    address: string | null
    occupation: string | null
    fileOpenedAt: string
    responsibleLawyerId: string | null
    status: string
    notes: string | null
  }
}

const initialState: ActionResult = { ok: true }
const NONE = '__none__'

export function ClientForm({ mode, lawyers, defaults }: Props) {
  const router = useRouter()
  const action = mode === 'create' ? createClientAction : updateClientAction
  const [state, formAction, pending] = useActionState(action, initialState)

  useEffect(() => {
    if (state.ok && state.message) {
      toast.success(state.message)
      const created = (state as ActionResult & { id?: string }).id
      if (mode === 'create' && created) router.push(`/clients/${created}`)
      else router.refresh()
    }
  }, [state, mode, router])

  const err = (name: string) => (!state.ok ? state.fieldErrors?.[name] : undefined)
  const today = new Date().toISOString().slice(0, 10)

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {defaults ? <input type="hidden" name="id" value={defaults.id} /> : null}
      <FormError message={!state.ok ? state.error : null} />

      <Card>
        <CardHeader>
          <CardTitle>البيانات الأساسية</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <FormField name="name" label="اسم العميل" required error={err('name')}
                     className="sm:col-span-2">
            <Input id="name" name="name" defaultValue={defaults?.name}
                   placeholder="الاسم الكامل أو اسم الشركة"
                   aria-invalid={Boolean(err('name'))} />
          </FormField>

          <FormField name="clientType" label="نوع العميل" required error={err('clientType')}>
            <Select name="clientType" defaultValue={defaults?.clientType ?? 'individual'}>
              <SelectTrigger id="clientType"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CLIENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{CLIENT_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField name="nationalId" label="رقم الهوية / السجل التجاري"
                     error={err('nationalId')}>
            <Input id="nationalId" name="nationalId" dir="ltr" className="text-start"
                   defaultValue={defaults?.nationalId ?? ''} />
          </FormField>

          <FormField name="occupation" label="المهنة / النشاط" error={err('occupation')}>
            <Input id="occupation" name="occupation" defaultValue={defaults?.occupation ?? ''} />
          </FormField>

          <FormField name="fileOpenedAt" label="تاريخ فتح الملف" required
                     error={err('fileOpenedAt')}>
            <Input id="fileOpenedAt" name="fileOpenedAt" type="date"
                   defaultValue={defaults?.fileOpenedAt ?? today}
                   aria-invalid={Boolean(err('fileOpenedAt'))} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>بيانات الاتصال</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <FormField name="phone" label="الهاتف" error={err('phone')}>
            <Input id="phone" name="phone" dir="ltr" className="text-start"
                   defaultValue={defaults?.phone ?? ''} placeholder="0599000000" />
          </FormField>

          <FormField name="whatsapp" label="واتساب" error={err('whatsapp')}>
            <Input id="whatsapp" name="whatsapp" dir="ltr" className="text-start"
                   defaultValue={defaults?.whatsapp ?? ''} placeholder="0599000000" />
          </FormField>

          <FormField name="email" label="البريد الإلكتروني" error={err('email')}>
            <Input id="email" name="email" type="email" dir="ltr" className="text-start"
                   defaultValue={defaults?.email ?? ''}
                   aria-invalid={Boolean(err('email'))} />
          </FormField>

          <FormField name="address" label="العنوان" error={err('address')}>
            <Input id="address" name="address" defaultValue={defaults?.address ?? ''} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>المتابعة</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <FormField name="responsibleLawyerId" label="المحامي المسؤول"
                     error={err('responsibleLawyerId')}>
            <Select name="responsibleLawyerId"
                    defaultValue={defaults?.responsibleLawyerId ?? NONE}>
              <SelectTrigger id="responsibleLawyerId">
                <SelectValue placeholder="غير محدّد" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>غير محدّد</SelectItem>
                {lawyers.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField name="status" label="الحالة" required error={err('status')}>
            <Select name="status" defaultValue={defaults?.status ?? 'active'}>
              <SelectTrigger id="status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CLIENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{CLIENT_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField name="notes" label="ملاحظات" error={err('notes')}
                     className="sm:col-span-2">
            <Textarea id="notes" name="notes" rows={3} defaultValue={defaults?.notes ?? ''} />
          </FormField>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" />
                   : mode === 'create' ? <UserPlus className="size-4" /> : <Save className="size-4" />}
          {mode === 'create' ? 'حفظ العميل' : 'حفظ التعديلات'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          إلغاء
        </Button>
      </div>
    </form>
  )
}
