'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, KeyRound } from 'lucide-react'
import { resetUserPasswordAction } from '../actions'
import type { ActionResult } from '@/modules/auth/actions'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, FormError } from '@/components/shared/form-field'

const initialState: ActionResult = { ok: true }

export function ResetPasswordCard({ userId, userName }: { userId: string; userName: string }) {
  const [state, formAction, pending] = useActionState(resetUserPasswordAction, initialState)

  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message)
  }, [state])

  const err = (name: string) => (!state.ok ? state.fieldErrors?.[name] : undefined)

  return (
    <Card>
      <CardHeader>
        <CardTitle>إعادة تعيين كلمة المرور</CardTitle>
        <CardDescription>
          تعيين كلمة مرور جديدة لـ «{userName}». أبلغه بها عبر قناة آمنة واطلب منه تغييرها بعد الدخول.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="space-y-4" noValidate>
          <input type="hidden" name="id" value={userId} />
          <FormError message={!state.ok ? state.error : null} />

          <FormField
            name="password" label="كلمة المرور الجديدة" required error={err('password')}
            hint="8 أحرف على الأقل، مع حرف كبير وصغير ورقم"
          >
            <Input
              id="password" name="password" type="password" dir="ltr" className="text-start"
              autoComplete="new-password"
              aria-invalid={Boolean(err('password'))}
            />
          </FormField>

          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            تعيين كلمة المرور
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
