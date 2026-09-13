import type { Metadata } from 'next'
import { LoginForm } from '@/modules/auth/components/login-form'

export const metadata: Metadata = { title: 'تسجيل الدخول' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  const { redirect } = await searchParams

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center lg:text-start">
        <h2 className="text-2xl font-bold">تسجيل الدخول</h2>
        <p className="text-sm text-muted-foreground">
          أدخل بياناتك للوصول إلى نظام إدارة المكتب
        </p>
      </div>
      <LoginForm redirectTo={redirect} />
    </div>
  )
}
