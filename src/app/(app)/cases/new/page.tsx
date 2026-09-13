import type { Metadata } from 'next'
import { requirePermission } from '@/lib/auth/session'
import { getCaseFormOptions } from '@/modules/cases/queries'
import { PageHeader } from '@/components/shared/page-header'
import { CaseForm } from '@/modules/cases/components/case-form'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const metadata: Metadata = { title: 'قضية جديدة' }

export default async function NewCasePage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  await requirePermission('cases', 'create')
  const [{ client }, options] = await Promise.all([searchParams, getCaseFormOptions()])

  // لا يمكن فتح قضية بلا عميل — نوجّه المستخدم للخطوة الصحيحة أولًا.
  if (options.clients.length === 0) {
    return (
      <>
        <PageHeader title="قضية جديدة" />
        <EmptyState
          icon="Users"
          title="لا يوجد عملاء بعد"
          description="كل قضية تُفتح باسم عميل. أضف العميل أولًا ثم افتح له القضية."
        >
          <Button asChild size="sm">
            <Link href="/clients/new">إضافة عميل</Link>
          </Button>
        </EmptyState>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="قضية جديدة"
        description="سيُولَّد رقم الملف الداخلي تلقائيًا عند الحفظ"
      />
      <div className="max-w-4xl">
        <CaseForm mode="create" options={options} defaultClientId={client} />
      </div>
    </>
  )
}
