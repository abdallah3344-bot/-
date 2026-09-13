import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ForgotPasswordForm } from '@/modules/auth/components/forgot-password-form'

export const metadata: Metadata = { title: 'استعادة كلمة المرور' }

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center lg:text-start">
        <h2 className="text-2xl font-bold">استعادة كلمة المرور</h2>
        <p className="text-sm text-muted-foreground">
          أدخل بريدك الإلكتروني وسنرسل إليك رابطًا لإعادة تعيين كلمة المرور
        </p>
      </div>

      <ForgotPasswordForm />

      <Link
        href="/login"
        className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="size-4" />
        العودة لتسجيل الدخول
      </Link>
    </div>
  )
}
