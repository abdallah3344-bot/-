'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkPermission } from '@/lib/auth/session'
import { logAudit } from '@/lib/audit'
import { getOcrProvider, type ExtractedFields } from './provider'
import type { ActionResult } from '@/modules/auth/actions'

/** حالة تهيئة مزوّد الاستخراج — تُعرض في الواجهة. */
export async function getOcrStatusAction(): Promise<{
  configured: boolean
  providerName: string
}> {
  const provider = getOcrProvider()
  return { configured: provider.isConfigured(), providerName: provider.name }
}

/**
 * يشغّل الاستخراج على مستند ويخزّن النتيجة بحالة «بانتظار المراجعة».
 * لا يُعدّل المستند ولا القضية — الربط لا يتم إلا بعد اعتماد المستخدم.
 */
export async function runExtractionAction(documentId: string): Promise<ActionResult> {
  const guard = await checkPermission('documents', 'update')
  if (!guard.ok) return { ok: false, error: guard.error }

  const provider = getOcrProvider()
  if (!provider.isConfigured()) {
    return {
      ok: false,
      error: 'لم يُهيّأ مزوّد استخراج نصوص بعد. يمكنك إدخال البيانات يدويًا ومراجعتها.',
    }
  }

  const supabase = await createClient()

  const { data: doc } = await supabase
    .from('documents')
    .select('storage_path, mime_type, name')
    .eq('id', documentId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!doc) return { ok: false, error: 'المستند غير موجود.' }

  await supabase.from('documents')
    .update({ ocr_status: 'processing' }).eq('id', documentId)

  const { data: file, error: downloadError } = await supabase.storage
    .from('documents').download(doc.storage_path)

  if (downloadError || !file) {
    await supabase.from('documents')
      .update({ ocr_status: 'failed' }).eq('id', documentId)
    return { ok: false, error: 'تعذّر قراءة الملف من التخزين.' }
  }

  const result = await provider.extract({
    buffer: await file.arrayBuffer(),
    mimeType: doc.mime_type ?? 'application/octet-stream',
    fileName: doc.name,
  })

  if (!result.ok) {
    await supabase.from('documents')
      .update({ ocr_status: 'failed' }).eq('id', documentId)
    return { ok: false, error: result.error }
  }

  await supabase.from('documents').update({
    ocr_status: 'done',
    ocr_text: result.fields.text ?? null,
    ocr_extracted: result.fields as never,
  }).eq('id', documentId)

  await logAudit({
    action: 'update',
    entity: 'documents',
    entityId: documentId,
    entityLabel: doc.name,
    summary: `استخراج بيانات المستند عبر ${provider.name} — بانتظار المراجعة`,
  })

  revalidatePath('/documents')
  return { ok: true, message: 'تم الاستخراج. راجع البيانات قبل اعتمادها.' }
}

const reviewSchema = z.object({
  documentId: z.string().uuid(),
  caseId: z.string().uuid().optional().or(z.literal('')),
  clientId: z.string().uuid().optional().or(z.literal('')),
  categoryId: z.string().uuid().optional().or(z.literal('')),
  docDate: z.string().trim().optional().or(z.literal('')),
  description: z.string().trim().optional().or(z.literal('')),
})

/**
 * اعتماد نتيجة الاستخراج بعد مراجعة بشرية.
 * هنا فقط تُربط البيانات بالقضية أو العميل — لا قبل ذلك.
 */
export async function approveExtractionAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await checkPermission('documents', 'update')
  if (!guard.ok) return { ok: false, error: guard.error }

  const nullable = (value: FormDataEntryValue | null) => {
    const text = typeof value === 'string' ? value : ''
    return text === '__none__' ? '' : text
  }

  const parsed = reviewSchema.safeParse({
    documentId: formData.get('documentId'),
    caseId: nullable(formData.get('caseId')),
    clientId: nullable(formData.get('clientId')),
    categoryId: nullable(formData.get('categoryId')),
    docDate: formData.get('docDate'),
    description: formData.get('description'),
  })

  if (!parsed.success) {
    return { ok: false, error: 'بيانات المراجعة غير صحيحة.' }
  }

  const input = parsed.data
  const supabase = await createClient()

  const { error } = await supabase.from('documents').update({
    case_id: input.caseId || null,
    client_id: input.clientId || null,
    category_id: input.categoryId || null,
    doc_date: input.docDate || null,
    description: input.description || null,
    ocr_reviewed_at: new Date().toISOString(),
    ocr_reviewed_by: guard.user.id,
  }).eq('id', input.documentId)

  if (error) return { ok: false, error: `تعذّر حفظ المراجعة: ${error.message}` }

  await logAudit({
    action: 'approve',
    entity: 'documents',
    entityId: input.documentId,
    summary: 'اعتماد بيانات المستند المستخرجة وربطها بالقضية',
  })

  revalidatePath('/documents')
  if (input.caseId) revalidatePath(`/cases/${input.caseId}`)
  return { ok: true, message: 'تم اعتماد البيانات وربط المستند.' }
}

/** يقرأ الحقول المستخرجة لعرضها في شاشة المراجعة. */
export async function getExtractionAction(documentId: string): Promise<{
  ok: boolean
  fields?: ExtractedFields
  status?: string
  error?: string
}> {
  const guard = await checkPermission('documents', 'view')
  if (!guard.ok) return { ok: false, error: guard.error }

  const supabase = await createClient()
  const { data } = await supabase
    .from('documents')
    .select('ocr_status, ocr_text, ocr_extracted')
    .eq('id', documentId)
    .maybeSingle()

  if (!data) return { ok: false, error: 'المستند غير موجود.' }

  return {
    ok: true,
    status: data.ocr_status,
    fields: (data.ocr_extracted ?? {}) as ExtractedFields,
  }
}
