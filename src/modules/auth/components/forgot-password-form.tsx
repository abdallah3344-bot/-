'use client'

import { useActionState } from 'react'
import { Loader2, Mail, CheckCircle2, AlertCircle } from 'lucide-react'
import { forgotPasswordAction, type ActionResult } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const initialState: ActionResult = { ok: true }

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initialState)

  if (state.ok && state.message) {
    return (
      <div
        role="status"
        className="flex items-start gap-2.5 rounded-[var(--radius-app)] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
      >
        <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
        <span>{state.message}</span>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {!state.ok ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[var(--radius-app)] border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email">البريد الإلكتروني</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          dir="ltr"
          className="text-start"
          placeholder="name@example.com"
        />
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            جارٍ الإرسال...
          </>
        ) : (
          <>
            <Mail className="size-4" />
            إرسال رابط الاستعادة
          </>
        )}
      </Button>
    </form>
  )
}
