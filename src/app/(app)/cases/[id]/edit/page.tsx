import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requirePermission } from '@/lib/auth/session'
import { getCase, getCaseFormOptions } from '@/modules/cases/queries'
import { PageHeader } from '@/components/shared/page-header'
import { CaseForm } from '@/modules/cases/components/case-form'

export const metadata: Metadata = { title: 'تعديل القضية' }

/** يحوّل صف القضية إلى قيم افتراضية نصّية للنموذج. */
function toDefaults(row: Record<string, unknown>): Record<string, string | null> {
  const text = (key: string) => {
    const value = row[key]
    return value === null || value === undefined ? null : String(value)
  }
  return {
    id: text('id'),
    title: text('title'),
    clientId: text('client_id'),
    courtCaseNo: text('court_case_no'),
    responsibleLawyerId: text('responsible_lawyer_id'),
    assistantLawyerId: text('assistant_lawyer_id'),
    caseTypeId: text('case_type_id'),
    courtId: text('court_id'),
    chamberId: text('chamber_id'),
    judgeId: text('judge_id'),
    governorate: text('governorate'),
    registeredAt: text('registered_at'),
    firstHearingAt: text('first_hearing_at'),
    litigationDegree: text('litigation_degree'),
    claimAmount: text('claim_amount'),
    priority: text('priority'),
    status: text('status'),
    description: text('description'),
    notes: text('notes'),
    claimRequests: text('claim_requests'),
    claimAroseAt: text('claim_arose_at'),
    propertyDescription: text('property_description'),
  }
}

export default async function EditCasePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePermission('cases', 'update')
  const { id } = await params

  const [row, options] = await Promise.all([getCase(id), getCaseFormOptions()])
  if (!row) notFound()

  return (
    <>
      <PageHeader
        title="تعديل القضية"
        description={`${String(row.title)} · ${String(row.internal_no)}`}
      />
      <div className="max-w-4xl">
        <CaseForm mode="edit" options={options} defaults={toDefaults(row)} />
      </div>
    </>
  )
}
