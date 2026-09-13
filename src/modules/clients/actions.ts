'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { checkPermission } from '@/lib/auth/session'
import { logAudit, diffChanges } from '@/lib/audit'
import { createClientSchema, updateClientSchema } from './schema'
import type { ActionResult } from '@/modules/auth/actions'

function fieldErrorsOf(issues: { path: (string | number | symbol)[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {}
  for (const issue of issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return fieldErrors
}

/** القوائم المنسدلة تُرسل قيمة حارسة بدل الفراغ؛ نحوّلها هنا. */
function nullable(value: FormDataEntryValue | null): string {
  const text = typeof value === 'string' ? value : ''
  return text === '__none__' ? '' : text
}

function readForm(formData: FormData) {
  return {
    name: formData.get('name'),
    clientType: formData.get('clientType'),
    nationalId: formData.get('nationalId'),
    phone: formData.get('phone'),
    whatsapp: formData.get('whatsapp'),
    email: formData.get('email'),
    address: formData.get('address'),
    occupation: formData.get('occupation'),
    fileOpenedAt: formData.get('fileOpenedAt'),
    responsibleLawyerId: nullable(formData.get('responsibleLawyerId')),
    status: formData.get('status'),
    notes: formData.get('notes'),
  }
}

/** يحوّل مدخلات النموذج إلى صف قاعدة البيانات. */
function toRow(input: {
  name: string; clientType: string; nationalId?: string; phone?: string
  whatsapp?: string; email?: string; address?: string; occupation?: string
  fileOpenedAt: string; responsibleLawyerId?: string; status: string; notes?: string
}) {
  return {
    name: input.name,
    client_type: input.clientType,
    national_id: input.nationalId || null,
    phone: input.phone || null,
    whatsapp: input.whatsapp || null,
    email: input.email || null,
    address: input.address || null,
    occupation: input.occupation || null,
    file_opened_at: input.fileOpenedAt,
    responsible_lawyer_id: input.responsibleLawyerId || null,
    status: input.status,
    notes: input.notes || null,
  }
}

export async function createClientAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult & { id?: string }> {
  const guard = await checkPermission('clients', 'create')
  if (!guard.ok) return { ok: false, error: guard.error }

  const parsed = createClientSchema.safeParse(readForm(formData))
  if (!parsed.success) {
    return {
      ok: false,
      error: 'يرجى تصحيح الحقول المحدّدة.',
      fieldErrors: fieldErrorsOf(parsed.error.issues),
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .insert({ ...toRow(parsed.data), created_by: guard.user.id, updated_by: guard.user.id })
    .select('id, client_no, name')
    .single()

  if (error) return { ok: false, error: `تعذّر حفظ العميل: ${error.message}` }

  await logAudit({
    action: 'create',
    entity: 'clients',
    entityId: data.id,
    entityLabel: data.name,
    summary: `إضافة عميل جديد برقم ${data.client_no}`,
  })

  revalidatePath('/clients')
  return { ok: true, message: `تم حفظ العميل «${data.name}» برقم ${data.client_no}.`, id: data.id }
}

export async function updateClientAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await checkPermission('clients', 'update')
  if (!guard.ok) return { ok: false, error: guard.error }

  const parsed = updateClientSchema.safeParse({ ...readForm(formData), id: formData.get('id') })
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
    .from('clients')
    .select('name, client_type, phone, email, status, responsible_lawyer_id')
    .eq('id', id)
    .maybeSingle()

  const patch = { ...toRow(input), updated_by: guard.user.id }
  const { error } = await supabase.from('clients').update(patch).eq('id', id)

  if (error) return { ok: false, error: `تعذّر حفظ التعديلات: ${error.message}` }

  await logAudit({
    action: 'update',
    entity: 'clients',
    entityId: id,
    entityLabel: input.name,
    summary: 'تعديل بيانات عميل',
    changes: before ? diffChanges(before, patch) : null,
  })

  revalidatePath('/clients')
  revalidatePath(`/clients/${id}`)
  return { ok: true, message: 'تم حفظ التعديلات بنجاح.' }
}

export async function deleteClientAction(id: string): Promise<ActionResult> {
  const guard = await checkPermission('clients', 'delete')
  if (!guard.ok) return { ok: false, error: guard.error }

  const supabase = await createClient()

  // لا نحذف عميلًا له قضايا: بياناته مرتبطة بملفات قانونية قائمة.
  const { count } = await supabase
    .from('cases')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', id)
    .is('deleted_at', null)

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `لا يمكن حذف عميل مرتبط بـ${count} قضية. أغلق قضاياه أو انقلها أولًا.`,
    }
  }

  const { error } = await supabase.rpc('soft_delete', { _entity: 'clients', _id: id } as never)
  if (error) return { ok: false, error: `تعذّر حذف العميل: ${error.message}` }

  revalidatePath('/clients')
  return { ok: true, message: 'تم حذف العميل.' }
}
