import type { Metadata } from 'next'
import { requireAuth } from '@/lib/auth/session'
import { PageHeader } from '@/components/shared/page-header'
import { ChangePasswordForm } from '@/modules/auth/components/change-password-form'

export const metadata: Metadata = { title: 'تغيير كلمة المرور' }

export default async function ChangePasswordPage() {
  await requireAuth()

  return (
    <>
      <PageHeader
        title="تغيير كلمة المرور"
        description="لحمايتك، سنطلب كلمة المرور الحالية قبل تعيين كلمة جديدة"
      />
      <div className="max-w-md">
        <ChangePasswordForm />
      </div>
    </>
  )
}
