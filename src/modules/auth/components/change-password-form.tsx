'use client'

import { useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Loader2, KeyRound } from 'lucide-react'
import { changePasswordAction, type ActionResult } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, FormError } from '@/components/shared/form-field'
import { Card, CardContent } from '@/components/ui/card'

const initialState: ActionResult = { ok: true }

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.ok && state.message) {
      toast.success(state.message)
      formRef.current?.reset()
    }
  }, [state])

  const err = (name: string) => (!state.ok ? state.fieldErrors?.[name] : undefined)

  return (
    <Card>
      <CardContent className="pt-5">
        <form ref={formRef} action={formAction} className="space-y-4" noValidate>
          <FormError message={!state.ok && !state.fieldErrors ? state.error : null} />

          <FormField
            name="currentPassword" label="كلمة المرور الحالية" required
            error={err('currentPassword')}
          >
            <Input
              id="currentPassword" name="currentPassword" type="password"
              dir="ltr" className="text-start" autoComplete="current-password"
              aria-invalid={Boolean(err('currentPassword'))}
            />
          </FormField>

          <FormField
            name="password" label="كلمة المرور الجديدة" required error={err('password')}
            hint="8 أحرف على الأقل، مع حرف كبير وصغير ورقم"
          >
            <Input
              id="password" name="password" type="password"
              dir="ltr" className="text-start" autoComplete="new-password"
              aria-invalid={Boolean(err('password'))}
            />
          </FormField>

          <FormField
            name="confirmPassword" label="تأكيد كلمة المرور الجديدة" required
            error={err('confirmPassword')}
          >
            <Input
              id="confirmPassword" name="confirmPassword" type="password"
              dir="ltr" className="text-start" autoComplete="new-password"
              aria-invalid={Boolean(err('confirmPassword'))}
            />
          </FormField>

          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            تغيير كلمة المرور
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
