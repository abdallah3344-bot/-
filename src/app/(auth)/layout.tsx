import { Scale } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('settings')
    .select('office_name, office_logo_url')
    .maybeSingle()

  const officeName = settings?.office_name ?? 'مكتب المحاماة'

  return (
    <div className="min-h-dvh grid lg:grid-cols-2">
      {/* لوحة الهوية — تختفي على الشاشات الصغيرة */}
      <div className="relative hidden lg:flex flex-col justify-between bg-navy-900 p-12 text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #c9a227 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
          aria-hidden
        />

        <div className="relative flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-gold-500 text-navy-950">
            <Scale className="size-6" />
          </div>
          <span className="text-lg font-semibold">{officeName}</span>
        </div>

        <div className="relative space-y-5">
          <div className="h-1 w-16 rounded-full bg-gold-500" />
          <h1 className="text-4xl font-bold leading-tight">
            نظام إدارة
            <br />
            مكتب المحاماة
          </h1>
          <p className="max-w-md text-navy-200 leading-relaxed">
            منصّة متكاملة لإدارة القضايا والعملاء والجلسات والمستندات والشؤون المالية،
            مبنية على قاعدة بيانات آمنة مع صلاحيات دقيقة لكل مستخدم.
          </p>
        </div>

        <p className="relative text-xs text-navy-300">
          جميع البيانات محفوظة ومشفّرة · وصول محكوم بالصلاحيات
        </p>
      </div>

      {/* منطقة النموذج */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* شعار مصغّر للموبايل */}
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-xl bg-navy-900 text-gold-400">
              <Scale className="size-5" />
            </div>
            <span className="text-lg font-semibold">{officeName}</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
