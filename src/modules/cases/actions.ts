'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { checkPermission } from '@/lib/auth/session'
import { logAudit, diffChanges } from '@/lib/audit'
import {
  createCaseSchema, updateCaseSchema, opponentSchema, closeCaseSchema,
} from './schema'
import type { ActionResult } from '@/modules/auth/actions'

function fieldErrorsOf(issues: { path: (string | number | symbol)[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {}
  for (const issue of issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return fieldErrors
}

/** القوائم المنسدلة تُرسل قيمة حارسة بدل الفراغ. */
function nullable(value: FormDataEntryValue | null): string {
  const text = typeof value === 'string' ? value : ''
  return text === '__none__' ? '' : text
}

function readForm(formData: FormData) {
  return {
    title: formData.get('title'),
    clientId: nullable(formData.get('clientId')),
    courtCaseNo: formData.get('courtCaseNo'),
    responsibleLawyerId: nullable(formData.get('responsibleLawyerId')),
    assistantLawyerId: nullable(formData.get('assistantLawyerId')),
    caseTypeId: nullable(formData.get('caseTypeId')),
    courtId: nullable(formData.get('courtId')),
    chamberId: nullable(formData.get('chamberId')),
    judgeId: nullable(formData.get('judgeId')),
    governorate: formData.get('governorate'),
    claimRequests: formData.get('claimRequests'),
    claimAroseAt: formData.get('claimAroseAt'),
    propertyDescription: formData.get('propertyDescription'),
    registeredAt: formData.get('registeredAt'),
    firstHearingAt: formData.get('firstHearingAt'),
    litigationDegree: nullable(formData.get('litigationDegree')),
    claimAmount: formData.get('claimAmount'),
    priority: formData.get('priority'),
    status: formData.get('status'),
    description: formData.get('description'),
    notes: formData.get('notes'),
  }
}

type CaseFields = {
  title: string; clientId: string; courtCaseNo?: string
  responsibleLawyerId?: string; assistantLawyerId?: string; caseTypeId?: string
  courtId?: string; chamberId?: string; judgeId?: string; governorate?: string
  claimRequests?: string; claimAroseAt?: string; propertyDescription?: string
  registeredAt?: string; firstHearingAt?: string; litigationDegree?: string
  claimAmount?: string; priority: string; status: string
  description?: string; notes?: string
}

function toRow(input: CaseFields) {
  return {
    title: input.title,
    client_id: input.clientId,
    court_case_no: input.courtCaseNo || null,
    responsible_lawyer_id: input.responsibleLawyerId || null,
    assistant_lawyer_id: input.assistantLawyerId || null,
    case_type_id: input.caseTypeId || null,
    court_id: input.courtId || null,
    chamber_id: input.chamberId || null,
    judge_id: input.judgeId || null,
    governorate: input.governorate || null,
    claim_requests: input.claimRequests || null,
    claim_arose_at: input.claimAroseAt || null,
    property_description: input.propertyDescription || null,
    registered_at: input.registeredAt || null,
    first_hearing_at: input.firstHearingAt || null,
    litigation_degree: input.litigationDegree || null,
    claim_amount: input.claimAmount ? Number(input.claimAmount) : null,
    priority: input.priority,
    status: input.status,
    description: input.description || null,
    notes: input.notes || null,
  }
}

export async function createCaseAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult & { id?: string }> {
  const guard = await checkPermission('cases', 'create')
  if (!guard.ok) return { ok: false, error: guard.error }

  const parsed = createCaseSchema.safeParse(readForm(formData))
  if (!parsed.success) {
    return {
      ok: false,
      error: 'يرجى تصحيح الحقول المحدّدة.',
      fieldErrors: fieldErrorsOf(parsed.error.issues),
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cases')
    .insert({ ...toRow(parsed.data), created_by: guard.user.id, updated_by: guard.user.id })
    .select('id, internal_no, title')
    .single()

  if (error) return { ok: false, error: `تعذّر حفظ القضية: ${error.message}` }

  await logAudit({
    action: 'create',
    entity: 'cases',
    entityId: data.id,
    entityLabel: data.title,
    summary: `فتح قضية جديدة برقم ${data.internal_no}`,
  })

  revalidatePath('/cases')
  return { ok: true, message: `تم فتح القضية برقم ${data.internal_no}.`, id: data.id }
}

export async function updateCaseAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const guard = await checkPermission('cases', 'update')
  if (!guard.ok) return { ok: false, error: guard.error }

  const parsed = updateCaseSchema.safeParse({ ...readForm(formData), id: formData.get('id') })
  if (!parsed.success) {
    return {
      ok: false,
      error: 'يرجى تصحيح الحقول المحدّدة.',
      fieldErrors: fieldErrorsOf(parsed.error.issues),
    }
  }

  const supabase = await createClient()
  const { id, ...input } = parsed.data

  const { data: before } = await supabase
    .from('cases')
    .select('title, status, priority, responsible_lawyer_id, court_id, claim_amount')
    .eq('id', id)
    .maybeSingle()

  const patch = { ...toRow(input), updated_by: guard.user.id }
  const { error } = await supabase.from('cases').update(patch).eq('id', id)

  if (error) return { ok: false, error: `تعذّر حفظ التعديلات: ${error.message}` }

  await logAudit({
    action: 'update',
    entity: 'cases',
    entityId: id,
    entityLabel: input.title,
    summary: 'تعديل بيانات قضية',
    changes: before ? diffChanges(before, patch) : null,
  })

  revalidatePath('/cases')
  revalidatePath(`/cases/${id}`)
  return { ok: true, message: 'تم حفظ التعديلات بنجاح.' }
}

export async function deleteCaseAction(id: string): Promise<ActionResult> {
  const guard = await checkPermission('cases', 'delete')
  if (!guard.ok) return { ok: false, error: guard.error }

  const supabase = await createClient()
  const { error } = await supabase.rpc('soft_delete', { _entity: 'cases', _id: id } as never)
  if (error) return { ok: false, error: `تعذّر حذف القضية: ${error.message}` }

  revalidatePath('/cases')
  return { ok: true, message: 'تم حذف القضية.' }
}

/** إغلاق القضية ونقلها للأرشيف. */
export async function closeCaseAction(id: string, reason: string): Promise<ActionResult> {
  const guard = await checkPermission('cases', 'approve')
  if (!guard.ok) return { ok: false, error: guard.error }

  const parsed = closeCaseSchema.safeParse({ id, reason })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة' }
  }

  const supabase = await createClient()

  // لا نغلق قضية بجلسات قادمة مجدولة — قد يفوت موعد محكمة.
  const { count } = await supabase
    .from('hearings')
    .select('id', { count: 'exact', head: true })
    .eq('case_id', id)
    .eq('status', 'scheduled')
    .gte('hearing_date', new Date().toISOString().slice(0, 10))
    .is('deleted_at', null)

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `لا يمكن إغلاق القضية ولديها ${count} جلسة قادمة مجدولة. ألغِ الجلسات أو علّمها منعقدة أولًا.`,
    }
  }

  const { error } = await supabase
    .from('cases')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      close_reason: parsed.data.reason,
      updated_by: guard.user.id,
    })
    .eq('id', id)

  if (error) return { ok: false, error: `تعذّر إغلاق القضية: ${error.message}` }

  await logAudit({
    action: 'close',
    entity: 'cases',
    entityId: id,
    summary: `إغلاق القضية — السبب: ${parsed.data.reason}`,
  })

  revalidatePath('/cases')
  revalidatePath(`/cases/${id}`)
  return { ok: true, message: 'تم إغلاق القضية ونقلها للأرشيف.' }
}

/** إعادة فتح قضية مؤرشفة — تتطلب صلاحية اعتماد على الأرشيف. */
export async function reopenCaseAction(id: string): Promise<ActionResult> {
  const guard = await checkPermission('archive', 'approve')
  if (!guard.ok) return { ok: false, error: guard.error }

  const supabase = await createClient()
  const { error } = await supabase
    .from('cases')
    .update({
      status: 'in_progress',
      closed_at: null,
      close_reason: null,
      archived_at: null,
      updated_by: guard.user.id,
    })
    .eq('id', id)

  if (error) return { ok: false, error: `تعذّر إعادة فتح القضية: ${error.message}` }

  await logAudit({ action: 'reopen', entity: 'cases', entityId: id, summary: 'إعادة فتح قضية مؤرشفة' })

  revalidatePath('/cases')
  revalidatePath('/archive')
  revalidatePath(`/cases/${id}`)
  return { ok: true, message: 'تمت إعادة فتح القضية.' }
}

// ---------------------------------------------------------------
// الخصوم
// ---------------------------------------------------------------

export async function saveOpponentAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await checkPermission('cases', 'update')
  if (!guard.ok) return { ok: false, error: guard.error }

  const parsed = opponentSchema.safeParse({
    caseId: formData.get('caseId'),
    name: formData.get('name'),
    nationalId: formData.get('nationalId'),
    occupation: formData.get('occupation'),
    workplace: formData.get('workplace'),
    legalCapacity: formData.get('legalCapacity'),
    phone: formData.get('phone'),
    address: formData.get('address'),
    lawyerName: formData.get('lawyerName'),
    lawyerPhone: formData.get('lawyerPhone'),
    notes: formData.get('notes'),
  })

  if (!parsed.success) {
    return {
      ok: false,
      error: 'يرجى تصحيح الحقول المحدّدة.',
      fieldErrors: fieldErrorsOf(parsed.error.issues),
    }
  }

  const input = parsed.data
  const supabase = await createClient()
  const existingId = formData.get('id')

  const row = {
    case_id: input.caseId,
    name: input.name,
    national_id: input.nationalId || null,
    occupation: input.occupation || null,
    workplace: input.workplace || null,
    legal_capacity: input.legalCapacity || null,
    phone: input.phone || null,
    address: input.address || null,
    lawyer_name: input.lawyerName || null,
    lawyer_phone: input.lawyerPhone || null,
    notes: input.notes || null,
  }

  const { error } =
    typeof existingId === 'string' && existingId
      ? await supabase.from('opponents').update(row).eq('id', existingId)
      : await supabase.from('opponents').insert(row)

  if (error) return { ok: false, error: `تعذّر حفظ بيانات الخصم: ${error.message}` }

  await logAudit({
    action: existingId ? 'update' : 'create',
    entity: 'opponents',
    entityId: typeof existingId === 'string' ? existingId : null,
    entityLabel: input.name,
    summary: existingId ? 'تعديل بيانات خصم' : 'إضافة خصم للقضية',
  })

  revalidatePath(`/cases/${input.caseId}`)
  return { ok: true, message: existingId ? 'تم حفظ بيانات الخصم.' : 'تمت إضافة الخصم.' }
}

export async function deleteOpponentAction(id: string, caseId: string): Promise<ActionResult> {
  const guard = await checkPermission('cases', 'update')
  if (!guard.ok) return { ok: false, error: guard.error }

  const supabase = await createClient()
  const { error } = await supabase.from('opponents').delete().eq('id', id)
  if (error) return { ok: false, error: `تعذّر حذف الخصم: ${error.message}` }

  await logAudit({ action: 'delete', entity: 'opponents', entityId: id, summary: 'حذف خصم من قضية' })

  revalidatePath(`/cases/${caseId}`)
  return { ok: true, message: 'تم حذف الخصم.' }
}

/** إضافة ملاحظة على القضية. */
export async function addCaseNoteAction(caseId: string, body: string): Promise<ActionResult> {
  const guard = await checkPermission('cases', 'update')
  if (!guard.ok) return { ok: false, error: guard.error }

  if (!body.trim()) return { ok: false, error: 'الملاحظة فارغة.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('case_notes')
    .insert({ case_id: caseId, body: body.trim(), created_by: guard.user.id })

  if (error) return { ok: false, error: `تعذّر حفظ الملاحظة: ${error.message}` }

  revalidatePath(`/cases/${caseId}`)
  return { ok: true, message: 'تمت إضافة الملاحظة.' }
}
