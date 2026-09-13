'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, LogIn, AlertCircle } from 'lucide-react'
import { loginAction, type ActionResult } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const initialState: ActionResult = { ok: true }

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState)
  const [showPassword, setShowPassword] = useState(false)

  // React يُفرّغ الحقول غير المتحكَّم بها بعد انتهاء أي form action.
  // نُبقي اسم المستخدم في حالة React حتى لا يضيع ما كتبه المستخدم
  // عند فشل المحاولة، ونُفرّغ كلمة المرور وحدها ونعيد التركيز عليها.
  const [identifier, setIdentifier] = useState('')
  const passwordRef = useRef<HTMLInputElement>(null)
  const failureCount = useRef(0)

  useEffect(() => {
    if (!state.ok && !pending) {
      failureCount.current += 1
      if (passwordRef.current) {
        passwordRef.current.value = ''
        passwordRef.current.focus()
      }
    }
  }, [state, pending])

  const fieldError = (name: string) => (!state.ok ? state.fieldErrors?.[name] : undefined)
  const generalError = !state.ok && !state.fieldErrors ? state.error : null

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {redirectTo ? <input type="hidden" name="redirect" value={redirectTo} /> : null}

      {generalError ? (
        <div
          data-login-error
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-2.5 rounded-[var(--radius-app)] border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{generalError}</span>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="identifier">اسم المستخدم أو البريد الإلكتروني</Label>
        <Input
          id="identifier"
          name="identifier"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          autoComplete="username"
          autoFocus
          dir="ltr"
          className="text-start"
          placeholder="admin"
          aria-invalid={Boolean(fieldError('identifier'))}
          aria-describedby={fieldError('identifier') ? 'identifier-error' : undefined}
        />
        {fieldError('identifier') ? (
          <p id="identifier-error" className="text-xs text-danger">
            {fieldError('identifier')}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">كلمة المرور</Label>
          <Link
            href="/forgot-password"
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            نسيت كلمة المرور؟
          </Link>
        </div>
        <div className="relative">
          <Input
            ref={passwordRef}
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            dir="ltr"
            className="text-start pe-10"
            placeholder="••••••••"
            aria-invalid={Boolean(fieldError('password'))}
            aria-describedby={fieldError('password') ? 'password-error' : undefined}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute end-0 top-0 flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {fieldError('password') ? (
          <p id="password-error" className="text-xs text-danger">
            {fieldError('password')}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            جارٍ التحقق...
          </>
        ) : (
          <>
            <LogIn className="size-4" />
            دخول
          </>
        )}
      </Button>
    </form>
  )
}
