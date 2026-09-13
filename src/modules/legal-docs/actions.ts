'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { checkPermission } from '@/lib/auth/session'
import { logAudit } from '@/lib/audit'
import {
  poaSchema, updatePoaSchema, contractSchema, updateContractSchema,
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

function nullable(value: FormDataEntryValue | null): string {
  const text = typeof value === 'string' ? value : ''
  return text === '__none__' ? '' : text
}

// ---------------------------------------------------------------
// الوكالات
// ---------------------------------------------------------------

function readPoaForm(formData: FormData) {
  return {
    clientId: nullable(formData.get('clientId')),
    caseId: nullable(formData.get('caseId')),
    poaType: formData.get('poaType'),
    issuedAt: formData.get('issuedAt'),
    expiresAt: formData.get('expiresAt'),
    lawyerId: nullable(formData.get('lawyerId')),
    status: formData.get('status'),
    documentId: nullable(formData.get('documentId')),
    notes: formData.get('notes'),
  }
}

type PoaFields = {
  clientId: string; caseId?: string; poaType: string; issuedAt: string
  expiresAt?: string; lawyerId?: string; status: string
  documentId?: string; notes?: string
}

function poaToRow(input: PoaFields) {
  return {
    client_id: input.clientId,
    case_id: input.caseId || null,
    poa_type: input.poaType,
    issued_at: input.issuedAt,
    expires_at: input.expiresAt || null,
    lawyer_id: input.lawyerId || null,
    status: input.status,
    document_id: input.documentId || null,
    notes: input.notes || null,
  }
}

export async function savePoaAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const id = formData.get('id')
  const isEdit = typeof id === 'string' && id.length > 0

  const guard = await checkPermission('poa', isEdit ? 'update' : 'create')
  if (!guard.ok) return { ok: false, error: guard.error }

  const parsed = isEdit
    ? updatePoaSchema.safeParse({ ...readPoaForm(formData), id })
    : poaSchema.safeParse(readPoaForm(formData))

  if (!parsed.success) {
    return {
      ok: false,
      error: 'يرجى تصحيح الحقول المحدّدة.',
      fieldErrors: fieldErrorsOf(parsed.error.issues),
    }
  }

  const supabase = await createClient()
  const data = parsed.data as PoaFields & { id?: string }
  const row = poaToRow(data)

  const { error } = isEdit
    ? await supabase.from('powers_of_attorney').update(row).eq('id', id as string)
    : await supabase.from('powers_of_attorney')
        .insert({ ...row, created_by: guard.user.id })

  if (error) return { ok: false, error: `تعذّر حفظ الوكالة: ${error.message}` }

  await logAudit({
    action: isEdit ? 'update' : 'create',
    entity: 'powers_of_attorney',
    entityId: isEdit ? (id as string) : null,
    summary: isEdit ? 'تعديل وكالة' : 'إضافة وكالة',
  })

  revalidatePath('/powers-of-attorney')
  revalidatePath('/calendar')
  return { ok: true, message: isEdit ? 'تم حفظ التعديلات.' : 'تمت إضافة الوكالة.' }
}

export async function deletePoaAction(id: string): Promise<ActionResult> {
  const guard = await checkPermission('poa', 'delete')
  if (!guard.ok) return { ok: false, error: guard.error }

  const supabase = await createClient()
  const { error } = await supabase.rpc('soft_delete',
    { _entity: 'powers_of_attorney', _id: id } as never)
  if (error) return { ok: false, error: `تعذّر حذف الوكالة: ${error.message}` }

  revalidatePath('/powers-of-attorney')
  return { ok: true, message: 'تم حذف الوكالة.' }
}

// ---------------------------------------------------------------
// العقود
// ---------------------------------------------------------------

function readContractForm(formData: FormData) {
  return {
    title: formData.get('title'),
    clientId: nullable(formData.get('clientId')),
    counterparty: formData.get('counterparty'),
    contractType: formData.get('contractType'),
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate'),
    value: formData.get('value'),
    lawyerId: nullable(formData.get('lawyerId')),
    status: formData.get('status'),
    documentId: nullable(formData.get('documentId')),
    notes: formData.get('notes'),
  }
}

type ContractFields = {
  title: string; clientId: string; counterparty?: string; contractType?: string
  startDate?: string; endDate?: string; value?: string; lawyerId?: string
  status: string; documentId?: string; notes?: string
}

function contractToRow(input: ContractFields) {
  return {
    title: input.title,
    client_id: input.clientId,
    counterparty: input.counterparty || null,
    contract_type: input.contractType || null,
    start_date: input.startDate || null,
    end_date: input.endDate || null,
    value: input.value ? Number(input.value) : null,
    lawyer_id: input.lawyerId || null,
    status: input.status,
    document_id: input.documentId || null,
    notes: input.notes || null,
  }
}

export async function saveContractAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const id = formData.get('id')
  const isEdit = typeof id === 'string' && id.length > 0

  const guard = await checkPermission('contracts', isEdit ? 'update' : 'create')
  if (!guard.ok) return { ok: false, error: guard.error }

  const parsed = isEdit
    ? updateContractSchema.safeParse({ ...readContractForm(formData), id })
    : contractSchema.safeParse(readContractForm(formData))

  if (!parsed.success) {
    return {
      ok: false,
      error: 'يرجى تصحيح الحقول المحدّدة.',
      fieldErrors: fieldErrorsOf(parsed.error.issues),
    }
  }

  const supabase = await createClient()
  const data = parsed.data as ContractFields & { id?: string }
  const row = contractToRow(data)

  const { error } = isEdit
    ? await supabase.from('contracts').update(row).eq('id', id as string)
    : await supabase.from('contracts').insert({ ...row, created_by: guard.user.id })

  if (error) return { ok: false, error: `تعذّر حفظ العقد: ${error.message}` }

  await logAudit({
    action: isEdit ? 'update' : 'create',
    entity: 'contracts',
    entityId: isEdit ? (id as string) : null,
    entityLabel: data.title,
    summary: isEdit ? 'تعديل عقد' : 'إضافة عقد',
  })

  revalidatePath('/contracts')
  revalidatePath('/calendar')
  return { ok: true, message: isEdit ? 'تم حفظ التعديلات.' : 'تمت إضافة العقد.' }
}

export async function deleteContractAction(id: string): Promise<ActionResult> {
  const guard = await checkPermission('contracts', 'delete')
  if (!guard.ok) return { ok: false, error: guard.error }

  const supabase = await createClient()
  const { error } = await supabase.rpc('soft_delete', { _entity: 'contracts', _id: id } as never)
  if (error) return { ok: false, error: `تعذّر حذف العقد: ${error.message}` }

  revalidatePath('/contracts')
  return { ok: true, message: 'تم حذف العقد.' }
}
