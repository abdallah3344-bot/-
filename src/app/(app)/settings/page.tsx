import type { Metadata } from 'next'
import { requirePermission } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { OfficeSettingsForm } from '@/modules/settings/components/office-settings-form'
import { LogoUpload } from '@/modules/settings/components/logo-upload'
import { LookupManager } from '@/modules/settings/components/lookup-manager'
import { BackupPanel } from '@/modules/settings/components/backup-panel'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = { title: 'الإعدادات' }

export default async function SettingsPage() {
  const user = await requirePermission('settings', 'view')
  const supabase = await createClient()
  const canEdit = user.permissions.can('settings', 'update')

  const [settingsRes, caseTypes, courts, docCategories, expenseCategories] = await Promise.all([
    supabase.from('settings').select('*').maybeSingle(),
    supabase.from('case_types').select('id, name_ar, is_active').order('sort_order'),
    supabase.from('courts').select('id, name_ar, governorate, is_active').order('name_ar'),
    supabase.from('document_categories').select('id, name_ar, is_active').order('sort_order'),
    supabase.from('expense_categories').select('id, name_ar, is_active').order('sort_order'),
  ])

  const settings = (settingsRes.data ?? {}) as Record<string, unknown>

  return (
    <>
      <PageHeader
        title="الإعدادات"
        description={canEdit ? 'بيانات المكتب والعملة والترقيم وجداول المراجع' : 'عرض فقط — لا تملك صلاحية التعديل'}
      />

      <Tabs defaultValue="office">
        <TabsList>
          <TabsTrigger value="office">بيانات المكتب</TabsTrigger>
          <TabsTrigger value="lookups">جداول المراجع</TabsTrigger>
          <TabsTrigger value="backup">النسخ الاحتياطي</TabsTrigger>
        </TabsList>

        <TabsContent value="office">
          {canEdit ? (
            <div className="max-w-4xl space-y-5">
              <LogoUpload currentUrl={(settings.office_logo_url as string) ?? null} />
              <OfficeSettingsForm settings={settings} />
            </div>
          ) : (
            <Card className="max-w-2xl">
              <CardContent className="space-y-2 pt-5 text-sm">
                <p><strong>اسم المكتب:</strong> {String(settings.office_name ?? '—')}</p>
                <p><strong>العنوان:</strong> {String(settings.office_address ?? '—')}</p>
                <p><strong>الهاتف:</strong> {String(settings.office_phone ?? '—')}</p>
                <p><strong>العملة:</strong> {String(settings.currency_symbol ?? '—')}</p>
                <p className="pt-2 text-muted-foreground">
                  لتعديل هذه البيانات راجع مدير النظام.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="lookups">
          <div className="grid gap-4 lg:grid-cols-2">
            <LookupManager
              table="case_types" title="أنواع القضايا" canEdit={canEdit}
              description="تظهر عند فتح قضية جديدة وفي التقارير"
              items={caseTypes.data ?? []}
            />
            <LookupManager
              table="courts" title="المحاكم" canEdit={canEdit} withGovernorate
              description="تظهر عند تسجيل القضايا والجلسات"
              items={courts.data ?? []}
            />
            <LookupManager
              table="document_categories" title="تصنيفات المستندات" canEdit={canEdit}
              description="تظهر عند رفع مستند"
              items={docCategories.data ?? []}
            />
            <LookupManager
              table="expense_categories" title="أنواع المصروفات" canEdit={canEdit}
              description="تظهر عند تسجيل مصروف"
              items={expenseCategories.data ?? []}
            />
          </div>
        </TabsContent>

        <TabsContent value="backup">
          <div className="max-w-2xl">
            <BackupPanel frequency={String(settings.backup_frequency ?? 'daily')} />
          </div>
        </TabsContent>
      </Tabs>
    </>
  )
}
