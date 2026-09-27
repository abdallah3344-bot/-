'use client'

import { useActionState, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Building2, CheckCircle2, XCircle, Globe, ExternalLink } from 'lucide-react'
import { registerOfficeAction, checkOfficeSlugAction, type RegisterResult } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, FormError } from '@/components/shared/form-field'

const initialState: RegisterResult = { ok: true }

type Values = Record<'officeName' | 'slug' | 'fullName' | 'phone' | 'username' | 'email', string>
type SlugCheck = { state: 'idle' | 'checking' | 'ok' | 'bad'; error?: string }
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerOfficeAction, initialState)
  // React يُفرّغ الحقول بعد كل إرسال — نحفظها حتى لا يعيد المستخدم كتابتها عند خطأ
  const [values, setValues] = useState<Values>({ officeName: '', slug: '', fullName: '', phone: '', username: '', email: '' })
  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: k === 'slug' ? e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') : e.target.value }))

  // فحص الرابط بعد توقف الكتابة بلحظة؛ الصيغة تُفحص فورًا هنا والتكرار في القاعدة
  const [remote, setRemote] = useState<{ slug: string; ok: boolean; error?: string } | null>(null)
  const slugLocalOk = SLUG_RE.test(values.slug) && !values.slug.includes('--')
  useEffect(() => {
    const s = values.slug
    if (!SLUG_RE.test(s) || s.includes('--')) return
    let alive = true
    const t = setTimeout(async () => {
      // تعذّر الفحص لا يمنع الإرسال — القاعدة تعيد الفحص عند التسجيل
      const r = await checkOfficeSlugAction(s).catch(() => ({ ok: true }))
      if (alive) setRemote({ slug: s, ...r })
    }, 450)
    return () => { alive = false; clearTimeout(t) }
  }, [values.slug])
  const slugCheck: SlugCheck = !values.slug
    ? { state: 'idle' }
    : !slugLocalOk
      ? { state: 'bad', error: 'أحرف إنجليزية صغيرة وأرقام وشرطة في الوسط، 3 أحرف على الأقل' }
      : remote?.slug === values.slug
        ? remote.ok ? { state: 'ok' } : { state: 'bad', error: remote.error }
        : { state: 'checking' }

  if (state.ok && state.done) return <RegisterDone site={state.done.site} signedIn={state.done.signedIn} />

  const err = (name: string) => (!state.ok ? state.fieldErrors?.[name] : undefined)
  const general = !state.ok && !state.fieldErrors ? state.error : null

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError message={general} />

      <FormField name="officeName" label="اسم المكتب" error={err('officeName')} required>
        <Input id="officeName" name="officeName" value={values.officeName} onChange={set('officeName')}
          placeholder="مكتب المحامي فلان" autoFocus aria-invalid={Boolean(err('officeName'))} />
      </FormField>

      <FormField name="slug" label="رابط موقع المكتب (بالإنجليزية)" required
        error={err('slug') ?? (slugCheck.state === 'bad' ? slugCheck.error : undefined)}
        hint={slugCheck.state === 'ok' ? undefined : 'هذا عنوان موقع مكتبك الخاص، ومنه يدخل موظفوك. مثال: alquds'}>
        <div className="flex items-center rounded-[var(--radius-app)] border border-input bg-background focus-within:ring-2 focus-within:ring-ring/40" dir="ltr">
          <Globe className="ms-3 size-4 shrink-0 text-muted-foreground" />
          <Input id="slug" name="slug" value={values.slug} onChange={set('slug')} maxLength={40}
            className="min-w-0 flex-1 border-0 bg-transparent px-2 text-start shadow-none focus-visible:ring-0 dark:bg-transparent" placeholder="alquds"
            autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-invalid={slugCheck.state === 'bad' || Boolean(err('slug'))} />
          <span className="shrink-0 pe-2 text-sm text-muted-foreground">.masryps.com</span>
          <span className="flex w-7 shrink-0 justify-center pe-2">
            {slugCheck.state === 'checking' ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
            {slugCheck.state === 'ok' ? <CheckCircle2 className="size-4 text-emerald-600" /> : null}
            {slugCheck.state === 'bad' ? <XCircle className="size-4 text-destructive" /> : null}
          </span>
        </div>
        {slugCheck.state === 'ok' ? (
          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
            الرابط متاح: <span dir="ltr" className="font-medium">{values.slug}.masryps.com</span>
          </p>
        ) : null}
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

      <Button type="submit" className="w-full" size="lg" disabled={pending || slugCheck.state === 'bad' || slugCheck.state === 'checking'}>
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

function RegisterDone({ site, signedIn }: { site: string; signedIn: boolean }) {
  const url = `https://${site}`
  return (
    <div className="space-y-5 text-center">
      <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
      <div>
        <h2 className="text-xl font-bold">تم تسجيل مكتبك</h2>
        <p className="mt-1 text-sm text-muted-foreground">هذا موقع مكتبك الخاص. منه تدخل أنت وموظفوك من الآن فصاعدًا:</p>
      </div>
      <a href={url} target="_blank" rel="noreferrer" dir="ltr"
        className="flex items-center justify-center gap-2 rounded-[var(--radius-app)] border bg-muted/40 px-4 py-3 text-lg font-semibold hover:bg-muted">
        {site} <ExternalLink className="size-4" />
      </a>
      <p className="text-xs text-muted-foreground">احفظ الرابط. قد يحتاج دقيقة أو دقيقتين حتى يعمل أول مرة.</p>
      <div className="flex flex-col gap-2">
        {signedIn ? (
          <Button asChild size="lg"><Link href="/dashboard">ابدأ العمل الآن</Link></Button>
        ) : (
          <Button asChild size="lg"><Link href="/login">تسجيل الدخول</Link></Button>
        )}
      </div>
    </div>
  )
}
