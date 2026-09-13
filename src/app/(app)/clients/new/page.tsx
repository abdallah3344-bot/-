import type { Metadata } from 'next'
import { requirePermission } from '@/lib/auth/session'
import { listLawyers } from '@/modules/clients/queries'
import { PageHeader } from '@/components/shared/page-header'
import { ClientForm } from '@/modules/clients/components/client-form'

export const metadata: Metadata = { title: 'عميل جديد' }

export default async function NewClientPage() {
  await requirePermission('clients', 'create')
  const lawyers = await listLawyers()

  return (
    <>
      <PageHeader
        title="عميل جديد"
        description="سيُولَّد رقم العميل تلقائيًا عند الحفظ"
      />
      <div className="max-w-4xl">
        <ClientForm mode="create" lawyers={lawyers} />
      </div>
    </>
  )
}
