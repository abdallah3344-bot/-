import type { Metadata } from 'next'
import { requireAuth } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { NotificationsView } from '@/modules/notifications/components/notifications-view'
import { NotificationSettingsForm } from '@/modules/notifications/components/settings-form'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export const metadata: Metadata = { title: 'التنبيهات' }

export default async function NotificationsPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  // المستخدم فتح مركز التنبيهات عمدًا، فنتجاوز الكبح ونفحص المصادر الآن
  await supabase.rpc('generate_notifications', { _force: true })

  const [listRes, settingsRes] = await Promise.all([
    supabase
      .from('notifications')
      .select('id, kind, title, body, entity, entity_id, link, severity, is_read, created_at')
      .eq('user_id', user.id)
      .order('is_read')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('notification_settings').select('*').eq('user_id', user.id).maybeSingle(),
  ])

  const notifications = listRes.data ?? []
  const unread = notifications.filter((n) => !n.is_read).length

  return (
    <>
      <PageHeader
        title="التنبيهات"
        description={unread > 0 ? `${unread} تنبيهًا غير مقروء` : 'لا توجد تنبيهات غير مقروءة'}
      />

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">
            التنبيهات {unread > 0 ? `(${unread})` : ''}
          </TabsTrigger>
          <TabsTrigger value="settings">إعدادات التنبيهات</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <NotificationsView notifications={notifications} unread={unread} />
        </TabsContent>

        <TabsContent value="settings">
          <div className="max-w-2xl">
            <NotificationSettingsForm
              defaults={{
                hearingReminder: settingsRes.data?.hearing_reminder ?? true,
                hearingDaysBefore: settingsRes.data?.hearing_days_before ?? 1,
                taskReminder: settingsRes.data?.task_reminder ?? true,
                installmentReminder: settingsRes.data?.installment_reminder ?? true,
                contractReminder: settingsRes.data?.contract_reminder ?? true,
                contractDaysBefore: settingsRes.data?.contract_days_before ?? 10,
                poaReminder: settingsRes.data?.poa_reminder ?? true,
                poaDaysBefore: settingsRes.data?.poa_days_before ?? 10,
                invoiceReminder: settingsRes.data?.invoice_reminder ?? true,
              }}
            />
          </div>
        </TabsContent>
      </Tabs>
    </>
  )
}
