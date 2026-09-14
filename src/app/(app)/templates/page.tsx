import type { Metadata } from 'next'
import { requirePermission } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { listTemplates } from '@/modules/templates/queries'
import { TemplateManager } from '@/modules/templates/components/template-manager'

export const metadata: Metadata = { title: 'قوالب المستندات' }

export default async function TemplatesPage() {
  const user = await requirePermission('documents', 'view')
  const canManage = user.permissions.can('settings', 'update')

  const supabase = await createClient()
  const [templates, { data: categories }] = await Promise.all([
    listTemplates(canManage),
    supabase.from('document_categories').select('id, name_ar').eq('is_active', true).order('sort_order'),
  ])

  return (
    <>
      <PageHeader
        title="قوالب المستندات"
        description={canManage
          ? 'قوالب المكتب: نصّية أو ملفات Word، تُملأ آليًا من بيانات القضية'
          : 'عرض فقط — إدارة القوالب تحتاج صلاحية تعديل الإعدادات'}
      />
      <TemplateManager
        templates={templates}
        categories={categories ?? []}
        canManage={canManage}
      />
    </>
  )
}
