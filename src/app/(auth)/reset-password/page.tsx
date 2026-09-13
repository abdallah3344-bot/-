import type { Metadata } from 'next'
import { ResetPasswordForm } from '@/modules/auth/components/reset-password-form'

export const metadata: Metadata = { title: 'تعيين كلمة مرور جديدة' }

export default function ResetPasswordPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center lg:text-start">
        <h2 className="text-2xl font-bold">تعيين كلمة مرور جديدة</h2>
        <p className="text-sm text-muted-foreground">
          اختر كلمة مرور قوية لا تقل عن 8 أحرف وتحتوي على حروف كبيرة وصغيرة وأرقام
        </p>
      </div>
      <ResetPasswordForm />
    </div>
  )
}
