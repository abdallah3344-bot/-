'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkPermission } from '@/lib/auth/session'
import { logAudit } from '@/lib/audit'
import type { ActionResult } from '@/modules/auth/actions'

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const MAX_SIZE = 10 * 1024 * 1024

const templateSchema = z.object({
  name: z.string().trim().min(2, 'اسم القالب مطلوب').max(120),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  scope: z.enum(['case', 'client', 'general']),
  categoryId: z.string().uuid().optional().or(z.literal('')),
  body: z.string().optional().or(z.literal('')),
})

function nullable(value: FormDataEntryValue | null): string {
  const text = typeof value === 'string' ? value : ''
  return text === '__none__' ? '' : text
}

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return fieldErrors
}

export async function saveTemplateAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await checkPermission('settings', 'update')
  if (!guard.ok) return { ok: false, error: guard.error }

  const parsed = templateSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    scope: formData.get('scope') || 'case',
    categoryId: nullable(formData.get('categoryId')),
    body: formData.get('body'),
  })

  if (!parsed.success) {
    return { ok: false, error: 'يرجى تصحيح الحقول المحدّدة.', fieldErrors: fieldErrorsOf(parsed.error) }
  }

  const input = parsed.data
  const id = String(formData.get('id') ?? '')
  const supabase = await createClient()

  // ملف Word اختياري: المكتب يرفع قالبه المعتمد كما هو
  const file = formData.get('file')
  let filePath: string | null = null
  let fileName: string | null = null

  if (file instanceof File && file.size > 0) {
    if (file.type !== DOCX_MIME) {
      return {
        ok: false, error: 'ملف القالب يجب أن يكون بصيغة Word حديثة (.docx).',
        fieldErrors: { file: 'صيغة غير مدعومة' },
      }
    }
    if (file.size > MAX_SIZE) {
      return { ok: false, error: 'حجم الملف يتجاوز 10 ميجابايت.', fieldErrors: { file: 'الملف كبير' } }
    }

    filePath = `${crypto.randomUUID()}.docx`
    fileName = file.name
    const { error } = await supabase.storage
      .from('templates')
      .upload(filePath, file, { contentType: DOCX_MIME, upsert: false })

    if (error) return { ok: false, error: `تعذّر رفع ملف القالب: ${error.message}` }
  }

  const body = (input.body ?? '').trim()
  if (!body && !filePath && !id) {
    return {
      ok: false,
      error: 'القالب يحتاج نصًّا أو ملف Word.',
      fieldErrors: { body: 'أدخل نص القالب أو ارفع ملفًا' },
    }
  }

  type TemplatePayload = {
    name: string
    description: string | null
    scope: 'case' | 'client' | 'general'
    category_id: string | null
    body: string | null
    updated_by: string
    file_path?: string
    file_name?: string | null
  }

  const payload: TemplatePayload = {
    name: input.name,
    description: input.description || null,
    scope: input.scope,
    category_id: input.categoryId || null,
    body: body || null,
    updated_by: guard.user.id,
  }
  if (filePath) {
    payload.file_path = filePath
    payload.file_name = fileName
  }

  if (id) {
    const { error } = await supabase.from('document_templates').update(payload).eq('id', id)
    if (error) return { ok: false, error: `تعذّر حفظ القالب: ${error.message}` }
    await logAudit({
      action: 'update', entity: 'document_template', entityId: id,
      entityLabel: input.name, summary: `تعديل قالب: ${input.name}`,
    })
  } else {
    const { data, error } = await supabase
      .from('document_templates')
      .insert({ ...payload, created_by: guard.user.id } as never)
      .select('id')
      .single()
    if (error) return { ok: false, error: `تعذّر حفظ القالب: ${error.message}` }
    await logAudit({
      action: 'create', entity: 'document_template', entityId: data?.id,
      entityLabel: input.name, summary: `إضافة قالب: ${input.name}`,
    })
  }

  revalidatePath('/templates')
  return { ok: true, message: 'تم حفظ القالب.' }
}

export async function deleteTemplateAction(id: string): Promise<ActionResult> {
  const guard = await checkPermission('settings', 'update')
  if (!guard.ok) return { ok: false, error: guard.error }

  const supabase = await createClient()
  const { data: before } = await supabase
    .from('document_templates').select('name').eq('id', id).maybeSingle()

  const { error } = await supabase
    .from('document_templates')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', id)

  if (error) return { ok: false, error: `تعذّر حذف القالب: ${error.message}` }

  await logAudit({
    action: 'delete', entity: 'document_template', entityId: id,
    entityLabel: before?.name ?? null, summary: `حذف قالب: ${before?.name ?? id}`,
  })

  revalidatePath('/templates')
  return { ok: true, message: 'تم حذف القالب.' }
}

export async function toggleTemplateAction(id: string, active: boolean): Promise<ActionResult> {
  const guard = await checkPermission('settings', 'update')
  if (!guard.ok) return { ok: false, error: guard.error }

  const supabase = await createClient()
  const { error } = await supabase
    .from('document_templates').update({ is_active: active }).eq('id', id)

  if (error) return { ok: false, error: `تعذّر تحديث القالب: ${error.message}` }

  revalidatePath('/templates')
  return { ok: true, message: active ? 'أُعيد تفعيل القالب.' : 'أُخفي القالب.' }
}
