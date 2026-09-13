'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Loader2, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react'
import { resetPasswordAction, type ActionResult } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const initialState: ActionResult = { ok: true }

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState)

  const fieldError = (name: string) => (!state.ok ? state.fieldErrors?.[name] : undefined)

  if (state.ok && state.message) {
    return (
      <div className="space-y-5">
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-[var(--radius-app)] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
          <span>{state.message}</span>
        </div>
        <Button asChild className="w-full" size="lg">
          <Link href="/login">الذهاب لتسجيل الدخول</Link>
        </Button>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {!state.ok && !state.fieldErrors ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[var(--radius-app)] border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="password">كلمة المرور الجديدة</Label>
        <Input id="password" name="password" type="password" dir="ltr" className="text-start"
               autoComplete="new-password" autoFocus />
        {fieldError('password') ? (
          <p className="text-xs text-danger">{fieldError('password')}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" dir="ltr"
               className="text-start" autoComplete="new-password" />
        {fieldError('confirmPassword') ? (
          <p className="text-xs text-danger">{fieldError('confirmPassword')}</p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? (
          <><Loader2 className="size-4 animate-spin" />جارٍ الحفظ...</>
        ) : (
          <><KeyRound className="size-4" />حفظ كلمة المرور</>
        )}
      </Button>
    </form>
  )
}
