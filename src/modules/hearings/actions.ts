'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { checkPermission } from '@/lib/auth/session'
import { logAudit, diffChanges } from '@/lib/audit'
import { hearingSchema, updateHearingSchema } from './schema'
import type { ActionResult } from '@/modules/auth/actions'

function fieldErrorsOf(issues: { path: (string | number | symbol)[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {}
  for (const issue of issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return fieldErrors
}

function nullable(value: FormDataEntryValue | null): string {
  const text = typeof value === 'string' ? value : ''
  return text === '__none__' ? '' : text
}

function readForm(formData: FormData) {
  return {
    caseId: nullable(formData.get('caseId')),
    courtId: nullable(formData.get('courtId')),
    chamberId: nullable(formData.get('chamberId')),
    judgeId: nullable(formData.get('judgeId')),
    hearingDate: formData.get('hearingDate'),
    hearingTime: formData.get('hearingTime'),
    room: formData.get('room'),
    assignedLawyerId: nullable(formData.get('assignedLawyerId')),
    hearingType: formData.get('hearingType'),
    requiredAction: formData.get('requiredAction'),
    result: formData.get('result'),
    decision: formData.get('decision'),
    notes: formData.get('notes'),
    nextHearingDate: formData.get('nextHearingDate'),
    status: formData.get('status'),
  }
}

type Fields = {
  caseId: string; courtId?: string; chamberId?: string; judgeId?: string
  hearingDate: string; hearingTime?: string; room?: string; assignedLawyerId?: string
  hearingType: string; requiredAction?: string; result?: string; decision?: string
  notes?: string; nextHearingDate?: string; status: string
}

function toRow(input: Fields) {
  return {
    case_id: input.caseId,
    court_id: input.courtId || null,
    chamber_id: input.chamberId || null,
    judge_id: input.judgeId || null,
    hearing_date: input.hearingDate,
    hearing_time: input.hearingTime || null,
    room: input.room || null,
    assigned_lawyer_id: input.assignedLawyerId || null,
    hearing_type: input.hearingType,
    required_action: input.requiredAction || null,
    result: input.result || null,
    decision: input.decision || null,
    notes: input.notes || null,
    next_hearing_date: input.nextHearingDate || null,
    status: input.status,
  }
}

export async function createHearingAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await checkPermission('hearings', 'create')
  if (!guard.ok) return { ok: false, error: guard.error }

  const parsed = hearingSchema.safeParse(readForm(formData))
  if (!parsed.success) {
    return {
      ok: false,
      error: 'يرجى تصحيح الحقول المحدّدة.',
      fieldErrors: fieldErrorsOf(parsed.error.issues),
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('hearings')
    .insert({ ...toRow(parsed.data), created_by: guard.user.id, updated_by: guard.user.id })
    .select('id, case_id')
    .single()

  if (error) return { ok: false, error: `تعذّر حفظ الجلسة: ${error.message}` }

  await logAudit({
    action: 'create',
    entity: 'hearings',
    entityId: data.id,
    summary: `إضافة جلسة بتاريخ ${parsed.data.hearingDate}`,
  })

  revalidatePath('/hearings')
  revalidatePath('/calendar')
  revalidatePath(`/cases/${data.case_id}`)
  return { ok: true, message: 'تم حفظ الجلسة بنجاح.' }
}

export async function updateHearingAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await checkPermission('hearings', 'update')
  if (!guard.ok) return { ok: false, error: guard.error }

  const parsed = updateHearingSchema.safeParse({ ...readForm(formData), id: formData.get('id') })
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
    .from('hearings')
    .select('hearing_date, hearing_time, status, result, decision')
    .eq('id', id)
    .maybeSingle()

  const patch = { ...toRow(input), updated_by: guard.user.id }
  const { error } = await supabase.from('hearings').update(patch).eq('id', id)

  if (error) return { ok: false, error: `تعذّر حفظ التعديلات: ${error.message}` }

  await logAudit({
    action: 'update',
    entity: 'hearings',
    entityId: id,
    summary: 'تعديل بيانات جلسة',
    changes: before ? diffChanges(before, patch) : null,
  })

  revalidatePath('/hearings')
  revalidatePath('/calendar')
  revalidatePath(`/cases/${input.caseId}`)
  return { ok: true, message: 'تم حفظ التعديلات بنجاح.' }
}

export async function deleteHearingAction(id: string): Promise<ActionResult> {
  const guard = await checkPermission('hearings', 'delete')
  if (!guard.ok) return { ok: false, error: guard.error }

  const supabase = await createClient()
  const { error } = await supabase.rpc('soft_delete', { _entity: 'hearings', _id: id } as never)
  if (error) return { ok: false, error: `تعذّر حذف الجلسة: ${error.message}` }

  revalidatePath('/hearings')
  revalidatePath('/calendar')
  return { ok: true, message: 'تم حذف الجلسة.' }
}

/**
 * تسجيل نتيجة الجلسة، وإنشاء الجلسة القادمة تلقائيًا عند التأجيل.
 * هذا أكثر ما يتكرّر يوميًا في المكتب، فجُعل عملية واحدة.
 */
export async function recordHearingResultAction(
  id: string,
  input: { result: string; decision: string; nextHearingDate: string; status: string },
): Promise<ActionResult> {
  const guard = await checkPermission('hearings', 'update')
  if (!guard.ok) return { ok: false, error: guard.error }

  const supabase = await createClient()

  const { data: hearing } = await supabase
    .from('hearings')
    .select('case_id, court_id, chamber_id, judge_id, assigned_lawyer_id, room, hearing_time')
    .eq('id', id)
    .maybeSingle()

  if (!hearing) return { ok: false, error: 'الجلسة غير موجودة.' }

  const { error } = await supabase
    .from('hearings')
    .update({
      result: input.result || null,
      decision: input.decision || null,
      next_hearing_date: input.nextHearingDate || null,
      status: input.status,
      updated_by: guard.user.id,
    })
    .eq('id', id)

  if (error) return { ok: false, error: `تعذّر تسجيل النتيجة: ${error.message}` }

  let created = false

  // عند التأجيل مع تحديد موعد قادم، نُنشئ الجلسة التالية بنفس البيانات
  if (input.status === 'postponed' && input.nextHearingDate) {
    const { error: insertError } = await supabase.from('hearings').insert({
      case_id: hearing.case_id,
      court_id: hearing.court_id,
      chamber_id: hearing.chamber_id,
      judge_id: hearing.judge_id,
      assigned_lawyer_id: hearing.assigned_lawyer_id,
      room: hearing.room,
      hearing_time: hearing.hearing_time,
      hearing_date: input.nextHearingDate,
      hearing_type: 'session',
      status: 'scheduled',
      created_by: guard.user.id,
    })
    if (!insertError) created = true
  }

  await logAudit({
    action: 'update',
    entity: 'hearings',
    entityId: id,
    summary: `تسجيل نتيجة الجلسة (${input.status})${created ? ' وإنشاء الجلسة القادمة' : ''}`,
  })

  revalidatePath('/hearings')
  revalidatePath('/calendar')
  revalidatePath(`/cases/${hearing.case_id}`)

  return {
    ok: true,
    message: created
      ? 'تم تسجيل النتيجة وإنشاء الجلسة القادمة تلقائيًا.'
      : 'تم تسجيل نتيجة الجلسة.',
  }
}
