'use client'

import { useActionState, useState } from 'react'
import { AlertCircle, CheckCircle2, KeyRound, Loader2, Send } from 'lucide-react'
import { activateLicenseAction, requestTrialAction } from '../actions'
import type { ActionResult } from '@/modules/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const initialState: ActionResult = { ok: true }

function Feedback({ state }: { state: ActionResult }) {
  const error = !state.ok && !state.fieldErrors ? state.error : null
  const success = state.ok ? state.message ?? null : null
  if (!error && !success) return null

  return (
    <div
      data-form-error={error ? '' : undefined}
      role="alert"
      aria-live="assertive"
      className={
        error
          ? 'flex items-start gap-2.5 rounded-[var(--radius-app)] border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300'
          : 'flex items-start gap-2.5 rounded-[var(--radius-app)] border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'
      }
    >
      {error ? (
        <AlertCircle className="size-4 shrink-0 mt-0.5" />
      ) : (
        <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
      )}
      <span>{error ?? success}</span>
    </div>
  )
}

export function ActivateByKeyForm({ defaultPhone }: { defaultPhone?: string | null }) {
  const [state, formAction, pending] = useActionState(activateLicenseAction, initialState)
  const [licenseKey, setLicenseKey] = useState('')
  const fieldError = (n: string) => (!state.ok ? state.fieldErrors?.[n] : undefined)

  return (
    <form action={formAction} className="space-y-4" noValidate data-testid="activate-form">
      <Feedback state={state} />

      <div className="space-y-2">
        <Label htmlFor="licenseKey">مفتاح الترخيص</Label>
        <Input
          id="licenseKey"
          name="licenseKey"
          value={licenseKey}
          onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
          placeholder="LAWO-XXXX-XXXX-XXXX"
          dir="ltr"
          className="text-center tracking-widest font-mono"
          aria-invalid={Boolean(fieldError('licenseKey'))}
        />
        {fieldError('licenseKey') ? (
          <p className="text-sm text-red-600 dark:text-red-400">{fieldError('licenseKey')}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">
          رقم الجوال <span className="text-muted-foreground">(إن كان الترخيص مرتبطًا برقم)</span>
        </Label>
        <Input
          id="phone"
          name="phone"
          defaultValue={defaultPhone ?? ''}
          placeholder="05xxxxxxxx"
          dir="ltr"
          inputMode="tel"
        />
      </div>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
        تفعيل الترخيص
      </Button>
    </form>
  )
}

export function RequestTrialForm({ defaultName }: { defaultName?: string | null }) {
  const [state, formAction, pending] = useActionState(requestTrialAction, initialState)
  const fieldError = (n: string) => (!state.ok ? state.fieldErrors?.[n] : undefined)

  return (
    <form action={formAction} className="space-y-4" noValidate data-testid="trial-form">
      <Feedback state={state} />

      <div className="space-y-2">
        <Label htmlFor="clientName">اسم المكتب</Label>
        <Input
          id="clientName"
          name="clientName"
          defaultValue={defaultName ?? ''}
          placeholder="مكتب المحاماة"
          aria-invalid={Boolean(fieldError('clientName'))}
        />
        {fieldError('clientName') ? (
          <p className="text-sm text-red-600 dark:text-red-400">{fieldError('clientName')}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="trialPhone">رقم الجوال</Label>
        <Input
          id="trialPhone"
          name="phone"
          placeholder="05xxxxxxxx"
          dir="ltr"
          inputMode="tel"
          aria-invalid={Boolean(fieldError('phone'))}
        />
        {fieldError('phone') ? (
          <p className="text-sm text-red-600 dark:text-red-400">{fieldError('phone')}</p>
        ) : null}
      </div>

      <Button type="submit" variant="outline" disabled={pending} className="w-full">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        طلب نسخة تجريبية
      </Button>
    </form>
  )
}
