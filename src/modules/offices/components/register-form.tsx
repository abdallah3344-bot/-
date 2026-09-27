'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Loader2, Building2 } from 'lucide-react'
import { registerOfficeAction, type RegisterResult } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, FormError } from '@/components/shared/form-field'

const initialState: RegisterResult = { ok: true }

type Values = Record<'officeName' | 'fullName' | 'phone' | 'username' | 'email', string>

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerOfficeAction, initialState)
  // React يُفرّغ الحقول بعد كل إرسال — نحفظها حتى لا يعيد المستخدم كتابتها عند خطأ
  const [values, setValues] = useState<Values>({ officeName: '', fullName: '', phone: '', username: '', email: '' })
  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }))

  const err = (name: string) => (!state.ok ? state.fieldErrors?.[name] : undefined)
  const general = !state.ok && !state.fieldErrors ? state.error : null

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError message={general} />

      <FormField name="officeName" label="اسم المكتب" error={err('officeName')} required>
        <Input id="officeName" name="officeName" value={values.officeName} onChange={set('officeName')}
          placeholder="مكتب المحامي فلان" autoFocus aria-invalid={Boolean(err('officeName'))} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField name="fullName" label="اسم مدير المكتب" error={err('fullName')} required>
          <Input id="fullName" name="fullName" value={values.fullName} onChange={set('fullName')}
            autoComplete="name" aria-invalid={Boolean(err('fullName'))} />
        </FormField>
        <FormField name="phone" label="رقم الجوال" error={err('phone')} required
          hint="يصلنا طلب تفعيل النسخة التجريبية عليه">
          <Input id="phone" name="phone" value={values.phone} onChange={set('phone')} inputMode="tel"
            dir="ltr" className="text-start" placeholder="0599000000" autoComplete="tel"
            aria-invalid={Boolean(err('phone'))} />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField name="username" label="اسم المستخدم للدخول" error={err('username')} required>
          <Input id="username" name="username" value={values.username} onChange={set('username')}
            dir="ltr" className="text-start" autoComplete="username" aria-invalid={Boolean(err('username'))} />
        </FormField>
        <FormField name="email" label="البريد الإلكتروني" error={err('email')} required>
          <Input id="email" name="email" type="email" value={values.email} onChange={set('email')}
            dir="ltr" className="text-start" autoComplete="email" aria-invalid={Boolean(err('email'))} />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField name="password" label="كلمة المرور" error={err('password')} required
          hint="8 أحرف على الأقل، فيها حرف كبير وصغير ورقم">
          <Input id="password" name="password" type="password" dir="ltr" className="text-start"
            autoComplete="new-password" aria-invalid={Boolean(err('password'))} />
        </FormField>
        <FormField name="confirmPassword" label="تأكيد كلمة المرور" error={err('confirmPassword')} required>
          <Input id="confirmPassword" name="confirmPassword" type="password" dir="ltr" className="text-start"
            autoComplete="new-password" aria-invalid={Boolean(err('confirmPassword'))} />
        </FormField>
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? (
          <><Loader2 className="size-4 animate-spin" /> جارٍ إنشاء المكتب...</>
        ) : (
          <><Building2 className="size-4" /> تسجيل المكتب</>
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        لديك حساب؟{' '}
        <Link href="/login" className="font-medium text-foreground hover:underline">تسجيل الدخول</Link>
      </p>
    </form>
  )
}
