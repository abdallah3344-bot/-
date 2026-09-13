'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { checkPermission } from '@/lib/auth/session'
import { logAudit } from '@/lib/audit'
import { taskSchema, updateTaskSchema } from './schema'
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
    title: formData.get('title'),
    description: formData.get('description'),
    caseId: nullable(formData.get('caseId')),
    clientId: nullable(formData.get('clientId')),
    assigneeId: nullable(formData.get('assigneeId')),
    dueDate: formData.get('dueDate'),
    priority: formData.get('priority'),
    status: formData.get('status'),
    notes: formData.get('notes'),
  }
}

type Fields = {
  title: string; description?: string; caseId?: string; clientId?: string
  assigneeId?: string; dueDate?: string; priority: string; status: string; notes?: string
}

function toRow(input: Fields) {
  return {
    title: input.title,
    description: input.description || null,
    case_id: input.caseId || null,
    client_id: input.clientId || null,
    assignee_id: input.assigneeId || null,
    due_date: input.dueDate || null,
    priority: input.priority,
    status: input.status,
    notes: input.notes || null,
    completed_at: input.status === 'completed' ? new Date().toISOString() : null,
  }
}

export async function createTaskAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const guard = await checkPermission('tasks', 'create')
  if (!guard.ok) return { ok: false, error: guard.error }

  const parsed = taskSchema.safeParse(readForm(formData))
  if (!parsed.success) {
    return {
      ok: false,
      error: 'يرجى تصحيح الحقول المحدّدة.',
      fieldErrors: fieldErrorsOf(parsed.error.issues),
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...toRow(parsed.data), created_by: guard.user.id, updated_by: guard.user.id })
    .select('id')
    .single()

  if (error) return { ok: false, error: `تعذّر حفظ المهمة: ${error.message}` }

  await logAudit({
    action: 'create', entity: 'tasks', entityId: data.id,
    entityLabel: parsed.data.title, summary: 'إضافة مهمة',
  })

  revalidatePath('/tasks')
  revalidatePath('/calendar')
  if (parsed.data.caseId) revalidatePath(`/cases/${parsed.data.caseId}`)
  return { ok: true, message: 'تم حفظ المهمة بنجاح.' }
}

export async function updateTaskAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const guard = await checkPermission('tasks', 'update')
  if (!guard.ok) return { ok: false, error: guard.error }

  const parsed = updateTaskSchema.safeParse({ ...readForm(formData), id: formData.get('id') })
  if (!parsed.success) {
    return {
      ok: false,
      error: 'يرجى تصحيح الحقول المحدّدة.',
      fieldErrors: fieldErrorsOf(parsed.error.issues),
    }
  }

  const supabase = await createClient()
  const { id, ...input } = parsed.data

  const { error } = await supabase
    .from('tasks')
    .update({ ...toRow(input), updated_by: guard.user.id })
    .eq('id', id)

  if (error) return { ok: false, error: `تعذّر حفظ التعديلات: ${error.message}` }

  await logAudit({
    action: 'update', entity: 'tasks', entityId: id,
    entityLabel: input.title, summary: 'تعديل مهمة',
  })

  revalidatePath('/tasks')
  revalidatePath('/calendar')
  if (input.caseId) revalidatePath(`/cases/${input.caseId}`)
  return { ok: true, message: 'تم حفظ التعديلات بنجاح.' }
}

/** تبديل حالة الإنجاز بنقرة واحدة من القائمة. */
export async function toggleTaskDoneAction(id: string, done: boolean): Promise<ActionResult> {
  const guard = await checkPermission('tasks', 'update')
  if (!guard.ok) return { ok: false, error: guard.error }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update({
      status: done ? 'completed' : 'in_progress',
      completed_at: done ? new Date().toISOString() : null,
      updated_by: guard.user.id,
    })
    .eq('id', id)

  if (error) return { ok: false, error: `تعذّر تحديث المهمة: ${error.message}` }

  revalidatePath('/tasks')
  revalidatePath('/calendar')
  return { ok: true, message: done ? 'تم إنجاز المهمة.' : 'أُعيدت المهمة قيد التنفيذ.' }
}

export async function deleteTaskAction(id: string): Promise<ActionResult> {
  const guard = await checkPermission('tasks', 'delete')
  if (!guard.ok) return { ok: false, error: guard.error }

  const supabase = await createClient()
  const { error } = await supabase.rpc('soft_delete', { _entity: 'tasks', _id: id } as never)
  if (error) return { ok: false, error: `تعذّر حذف المهمة: ${error.message}` }

  revalidatePath('/tasks')
  revalidatePath('/calendar')
  return { ok: true, message: 'تم حذف المهمة.' }
}
