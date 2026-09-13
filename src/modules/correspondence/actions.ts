'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { checkPermission } from '@/lib/auth/session'
import { logAudit } from '@/lib/audit'
import { correspondenceSchema } from './schema'
import type { ActionResult } from '@/modules/auth/actions'

function nullable(value: FormDataEntryValue | null): string {
  const text = typeof value === 'string' ? value : ''
  return text === '__none__' ? '' : text
}

export async function saveCorrespondenceAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const id = formData.get('id')
  const isEdit = typeof id === 'string' && id.length > 0

  const guard = await checkPermission('correspondence', isEdit ? 'update' : 'create')
  if (!guard.ok) return { ok: false, error: guard.error }

  const parsed = correspondenceSchema.safeParse({
    direction: formData.get('direction'),
    partyType: formData.get('partyType'),
    partyName: formData.get('partyName'),
    subject: formData.get('subject'),
    body: formData.get('body'),
    corrDate: formData.get('corrDate'),
    clientId: nullable(formData.get('clientId')),
    caseId: nullable(formData.get('caseId')),
    ownerId: nullable(formData.get('ownerId')),
    documentId: nullable(formData.get('documentId')),
    status: formData.get('status'),
  })

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return { ok: false, error: 'يرجى تصحيح الحقول المحدّدة.', fieldErrors }
  }

  const input = parsed.data
  const supabase = await createClient()

  const row = {
    direction: input.direction,
    party_type: input.partyType,
    party_name: input.partyName,
    subject: input.subject,
    body: input.body || null,
    corr_date: input.corrDate,
    client_id: input.clientId || null,
    case_id: input.caseId || null,
    owner_id: input.ownerId || null,
    document_id: input.documentId || null,
    status: input.status,
  }

  const { data, error } = isEdit
    ? await supabase.from('correspondence').update(row).eq('id', id as string)
        .select('id, reference_no').single()
    : await supabase.from('correspondence').insert({ ...row, created_by: guard.user.id })
        .select('id, reference_no').single()

  if (error) return { ok: false, error: `تعذّر حفظ المراسلة: ${error.message}` }

  await logAudit({
    action: isEdit ? 'update' : 'create',
    entity: 'correspondence',
    entityId: data.id,
    entityLabel: data.reference_no,
    summary: `${isEdit ? 'تعديل' : 'تسجيل'} مراسلة ${input.direction === 'outgoing' ? 'صادرة' : 'واردة'}`,
  })

  revalidatePath('/correspondence')
  return {
    ok: true,
    message: isEdit ? 'تم حفظ المراسلة.' : `تم تسجيل المراسلة برقم ${data.reference_no}.`,
  }
}

export async function deleteCorrespondenceAction(id: string): Promise<ActionResult> {
  const guard = await checkPermission('correspondence', 'delete')
  if (!guard.ok) return { ok: false, error: guard.error }

  const supabase = await createClient()
  const { error } = await supabase.rpc('soft_delete',
    { _entity: 'correspondence', _id: id } as never)
  if (error) return { ok: false, error: `تعذّر حذف المراسلة: ${error.message}` }

  revalidatePath('/correspondence')
  return { ok: true, message: 'تم حذف المراسلة.' }
}
