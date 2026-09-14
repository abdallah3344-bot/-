import { Scale } from 'lucide-react'
import { requireAuth } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

/**
 * تخطيط صفحة التفعيل: يتطلب جلسة صالحة فقط، ولا يمرّ بحارس الترخيص
 * — وإلا لصار التوجيه دائريًا حين يكون الترخيص غير سارٍ.
 */
export default async function LicenseLayout({ children }: { children: React.ReactNode }) {
  await requireAuth()
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('settings')
    .select('office_name')
    .maybeSingle()

  return (
    <div className="min-h-dvh bg-muted/40 px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-xl space-y-8">
        <div className="flex items-center justify-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-navy-900 text-gold-400">
            <Scale className="size-6" />
          </div>
          <span className="text-lg font-semibold">
            {settings?.office_name ?? 'مكتب المحاماة'}
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}
