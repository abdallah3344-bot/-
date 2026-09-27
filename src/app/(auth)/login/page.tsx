import type { Metadata } from 'next'
import Link from 'next/link'
import { LoginForm } from '@/modules/auth/components/login-form'
import { getHostOffice } from '@/lib/office-host'

export const metadata: Metadata = { title: 'تسجيل الدخول' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; registered?: string }>
}) {
  const { redirect, registered } = await searchParams
  const hostOffice = await getHostOffice()

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center lg:text-start">
        <h2 className="text-2xl font-bold">تسجيل الدخول</h2>
        <p className="text-sm text-muted-foreground">
          أدخل بياناتك للوصول إلى نظام إدارة المكتب
        </p>
      </div>
      {registered ? (
        <p className="rounded-[var(--radius-app)] border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          سُجّل مكتبك. ادخل باسم المستخدم وكلمة المرور.
        </p>
      ) : null}
      <LoginForm redirectTo={redirect} />
      {hostOffice ? null : (
        <p className="text-center text-sm text-muted-foreground">
          مكتب جديد؟{' '}
          <Link href="/register" className="font-medium text-foreground hover:underline">سجّل مكتبك</Link>
        </p>
      )}
    </div>
  )
}
