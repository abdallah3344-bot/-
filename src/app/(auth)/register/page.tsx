import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { RegisterForm } from '@/modules/offices/components/register-form'
import { getHostOffice } from '@/lib/office-host'

export const metadata: Metadata = { title: 'تسجيل مكتب جديد' }

export default async function RegisterPage() {
  // رابط مكتب فرعي لمكتب قائم — لا تسجيل منه
  if (await getHostOffice()) redirect('/login')

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center lg:text-start">
        <h2 className="text-2xl font-bold">تسجيل مكتب جديد</h2>
        <p className="text-sm text-muted-foreground">
          أنشئ حساب مكتبك. بعد اعتماد طلبك تبدأ النسخة التجريبية، وبيانات مكتبك
          منفصلة تمامًا عن أي مكتب آخر.
        </p>
      </div>
      <RegisterForm />
    </div>
  )
}
