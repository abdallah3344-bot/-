import type { Metadata } from 'next'
import { requirePermission } from '@/lib/auth/session'
import { listDocuments, listDocumentCategories } from '@/modules/documents/queries'
import { listOpenCases } from '@/modules/hearings/queries'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { FilterBar } from '@/components/shared/filter-bar'
import { Pagination } from '@/components/shared/pagination'
import { DocumentsView } from '@/modules/documents/components/documents-view'
import { getOcrStatusAction } from '@/modules/ocr/actions'
import type { SearchParams } from '@/lib/query'

export const metadata: Metadata = { title: 'المستندات' }

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const user = await requirePermission('documents', 'view')
  const params = await searchParams
  const supabase = await createClient()

  const [{ rows, total, page, pageSize }, categories, cases, clientsRes, ocr] = await Promise.all([
    listDocuments(params),
    listDocumentCategories(),
    listOpenCases(),
    supabase.from('clients').select('id, name').is('deleted_at', null).order('name').limit(1000),
    getOcrStatusAction(),
  ])

  return (
    <>
      <PageHeader title="المستندات" description={`${total} مستند محفوظ`} />

      <FilterBar
        searchPlaceholder="ابحث باسم المستند أو وصفه..."
        filters={[
          {
            name: 'category', label: 'التصنيف',
            options: categories.map((c) => ({ value: c.id, label: c.name_ar })),
          },
        ]}
      />

      <DocumentsView
        rows={rows}
        options={{ categories, cases, clients: clientsRes.data ?? [] }}
        canCreate={user.permissions.can('documents', 'create')}
        canUpdate={user.permissions.can('documents', 'update')}
        canDelete={user.permissions.can('documents', 'delete')}
        canDownload={user.permissions.can('documents', 'download')}
        ocrConfigured={ocr.configured}
        providerName={ocr.providerName}
      />

      <Pagination page={page} pageSize={pageSize} total={total} />
    </>
  )
}
