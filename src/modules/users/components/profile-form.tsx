'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import { updateMyProfileAction } from '../actions'
import type { ActionResult } from '@/modules/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, FormError } from '@/components/shared/form-field'
import { Card, CardContent } from '@/components/ui/card'

const initialState: ActionResult = { ok: true }

type Props = {
  defaults: { fullName: string; phone: string | null; jobTitle: string | null }
  username: string
  email: string
}

export function ProfileForm({ defaults, username, email }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(updateMyProfileAction, initialState)

  useEffect(() => {
    if (state.ok && state.message) {
      toast.success(state.message)
      router.refresh()
    }
  }, [state, router])

  const err = (name: string) => (!state.ok ? state.fieldErrors?.[name] : undefined)

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormError message={!state.ok ? state.error : null} />

      <Card>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <FormField name="fullName" label="الاسم الكامل" required error={err('fullName')}>
            <Input
              id="fullName" name="fullName"
              defaultValue={defaults.fullName}
              aria-invalid={Boolean(err('fullName'))}
            />
          </FormField>

          <FormField name="jobTitle" label="المسمّى الوظيفي" error={err('jobTitle')}>
            <Input id="jobTitle" name="jobTitle" defaultValue={defaults.jobTitle ?? ''} />
          </FormField>

          <FormField name="phone" label="رقم الهاتف" error={err('phone')}>
            <Input
              id="phone" name="phone" dir="ltr" className="text-start"
              defaultValue={defaults.phone ?? ''}
              placeholder="0599000000"
            />
          </FormField>

          <FormField
            name="username_display" label="اسم المستخدم"
            hint="لا يمكن تغيير اسم المستخدم أو البريد إلا عبر مدير النظام"
          >
            <Input id="username_display" dir="ltr" className="text-start" value={username} disabled readOnly />
          </FormField>

          <FormField name="email_display" label="البريد الإلكتروني" className="sm:col-span-2">
            <Input id="email_display" dir="ltr" className="text-start" value={email} disabled readOnly />
          </FormField>
        </CardContent>
      </Card>

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        حفظ البيانات
      </Button>
    </form>
  )
}
