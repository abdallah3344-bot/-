import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requirePermission } from '@/lib/auth/session'
import { PageHeader } from '@/components/shared/page-header'
import { PrintButton } from '@/components/shared/print-button'
import { getTemplate } from '@/modules/templates/queries'
import { buildCaseContext, buildClientContext } from '@/modules/templates/context'
import { renderTemplate, missingFields, MISSING_MARK } from '@/modules/templates/render'
import { MERGE_FIELDS } from '@/modules/templates/fields'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'معاينة مستند' }

export default async function TemplatePreviewPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ case?: string; client?: string }>
}) {
  const user = await requirePermission('documents', 'view')
  const { id } = await params
  const { case: caseId, client: clientId } = await searchParams

  const template = await getTemplate(id)
  if (!template || !template.body) notFound()

  const context = caseId
    ? await buildCaseContext(caseId)
    : clientId
      ? await buildClientContext(clientId)
      : {}

  const rendered = renderTemplate(template.body, context)
  const missing = missingFields(template.body, context)
  const labelOfField = (key: string) =>
    MERGE_FIELDS.find((f) => f.key === key)?.label ?? key

  return (
    <>
      <PageHeader title={template.name} description={template.description ?? undefined}>
        {user.permissions.can('documents', 'print') ? (
          <PrintButton label="طباعة / حفظ PDF" />
        ) : null}
      </PageHeader>

      {missing.length > 0 ? (
        <div className="no-print mb-4 rounded-[var(--radius-app)] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="mb-1.5 font-medium">
            {missing.length} حقلًا بلا بيانات — يظهر مكانها «{MISSING_MARK}»
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((key) => (
              <Badge key={key} variant="warning">{labelOfField(key)}</Badge>
            ))}
          </div>
        </div>
      ) : null}

      <div className="max-w-3xl">
        <div className="print-sheet rounded-[var(--radius-app)] border border-border bg-surface p-6 sm:p-10">
          <pre className="whitespace-pre-wrap break-words font-[inherit] text-[15px] leading-8">
            {rendered}
          </pre>
        </div>
      </div>
    </>
  )
}
