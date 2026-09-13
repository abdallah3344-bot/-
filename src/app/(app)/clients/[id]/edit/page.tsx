import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requirePermission } from '@/lib/auth/session'
import { getClient, listLawyers } from '@/modules/clients/queries'
import { PageHeader } from '@/components/shared/page-header'
import { ClientForm } from '@/modules/clients/components/client-form'

export const metadata: Metadata = { title: 'تعديل بيانات العميل' }

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePermission('clients', 'update')
  const { id } = await params

  const [client, lawyers] = await Promise.all([getClient(id), listLawyers()])
  if (!client) notFound()

  return (
    <>
      <PageHeader title="تعديل بيانات العميل" description={`${client.name} · ${client.client_no}`} />
      <div className="max-w-4xl">
        <ClientForm
          mode="edit"
          lawyers={lawyers}
          defaults={{
            id: client.id,
            name: client.name,
            clientType: client.client_type,
            nationalId: client.national_id,
            phone: client.phone,
            whatsapp: client.whatsapp,
            email: client.email,
            address: client.address,
            occupation: client.occupation,
            fileOpenedAt: client.file_opened_at,
            responsibleLawyerId: client.responsible_lawyer_id,
            status: client.status,
            notes: client.notes,
          }}
        />
      </div>
    </>
  )
}
