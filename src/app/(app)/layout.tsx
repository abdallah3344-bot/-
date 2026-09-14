import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import { NAVIGATION } from '@/lib/constants/navigation'
import { getLicenseStatus } from '@/modules/license/service'
import { LicenseBanner } from '@/modules/license/components/license-banner'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // الطبقة الثانية: لا شيء يُصيَّر قبل التحقق من الجلسة.
  const user = await requireAuth()

  // بوابة الترخيص: لا يُصيَّر أي شيء من النظام بلا ترخيص سارٍ.
  // التحقق يسأل خادم التراخيص مباشرة، فلا يُزوَّر بالكتابة في جدول.
  const license = await getLicenseStatus()
  if (!license.allowed) redirect('/activation')

  const supabase = await createClient()

  // نولّد التنبيهات المستحقة قبل قراءة العدّاد ليكون رقم الترويسة صحيحًا
  // من أول تحميل. الدالة مكبوحة في القاعدة إلى مرة كل عشر دقائق لكل مستخدم،
  // فلا تتحوّل إلى كتابة على كل تنقّل.
  await supabase.rpc('generate_notifications')

  const [{ data: settings }, { count: unreadCount }] = await Promise.all([
    supabase.from('settings').select('office_name, office_logo_url').maybeSingle(),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false),
  ])

  // القائمة تُبنى من صلاحيات المستخدم — لا روابط لا يستطيع فتحها.
  const items = NAVIGATION.filter((item) => user.permissions.canAccessModule(item.module))

  return (
    <AppShell
      items={items}
      officeName={settings?.office_name ?? 'مكتب المحاماة'}
      officeLogoUrl={settings?.office_logo_url ?? null}
      user={{
        fullName: user.fullName,
        roleName: user.roleName,
        email: user.email,
        avatarUrl: user.avatarUrl,
      }}
      canSearch={user.permissions.canAccessModule('clients') || user.permissions.canAccessModule('cases')}
      unreadCount={unreadCount ?? 0}
    >
      <LicenseBanner status={license} />
      {children}
    </AppShell>
  )
}
