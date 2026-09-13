'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkPermission } from '@/lib/auth/session'
import { logAudit } from '@/lib/audit'
import type { ActionResult } from '@/modules/auth/actions'

/** الأنواع المسموحة — مطابقة لما تقبله حاوية التخزين. */
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg', 'image/png', 'image/webp',
])

const EXTENSION_BY_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const MAX_SIZE = 50 * 1024 * 1024 // 50 ميجابايت

const uploadSchema = z.object({
  name: z.string().trim().min(1, 'اسم المستند مطلوب'),
  categoryId: z.string().uuid().optional().or(z.literal('')),
  caseId: z.string().uuid().optional().or(z.literal('')),
  clientId: z.string().uuid().optional().or(z.literal('')),
  docDate: z.string().trim().optional().or(z.literal('')),
  description: z.string().trim().optional().or(z.literal('')),
})

function nullable(value: FormDataEntryValue | null): string {
  const text = typeof value === 'string' ? value : ''
  return text === '__none__' ? '' : text
}

export async function uploadDocumentAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await checkPermission('documents', 'create')
  if (!guard.ok) return { ok: false, error: guard.error }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'اختر ملفًا للرفع.', fieldErrors: { file: 'الملف مطلوب' } }
  }

  // التحقق من الملف قبل أي كتابة — النوع والحجم.
  if (!ALLOWED_MIME.has(file.type)) {
    return {
      ok: false,
      error: 'نوع الملف غير مدعوم. المسموح: PDF و Word و Excel وصور JPG/PNG/WEBP.',
      fieldErrors: { file: 'نوع ملف غير مدعوم' },
    }
  }

  if (file.size > MAX_SIZE) {
    return {
      ok: false,
      error: 'حجم الملف يتجاوز 50 ميجابايت.',
      fieldErrors: { file: 'الملف كبير جدًا' },
    }
  }

  const parsed = uploadSchema.safeParse({
    name: formData.get('name') || file.name,
    categoryId: nullable(formData.get('categoryId')),
    caseId: nullable(formData.get('caseId')),
    clientId: nullable(formData.get('clientId')),
    docDate: formData.get('docDate'),
    description: formData.get('description'),
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

  // مسار التخزين لا يستخدم اسم الملف الأصلي إطلاقًا:
  // قد يحتوي محارف مسار أو عربية تكسر التخزين، وقد يكشف معلومات.
  const extension = EXTENSION_BY_MIME[file.type] ?? 'bin'
  const folder = input.caseId ? `cases/${input.caseId}`
               : input.clientId ? `clients/${input.clientId}`
               : 'general'
  const storagePath = `${folder}/${crypto.randomUUID()}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    return { ok: false, error: `تعذّر رفع الملف: ${uploadError.message}` }
  }

  const { data, error } = await supabase
    .from('documents')
    .insert({
      name: input.name,
      category_id: input.categoryId || null,
      case_id: input.caseId || null,
      client_id: input.clientId || null,
      storage_path: storagePath,
      mime_type: file.type,
      size_bytes: file.size,
      doc_date: input.docDate || null,
      description: input.description || null,
      uploaded_by: guard.user.id,
    })
    .select('id')
    .single()

  if (error) {
    // فشل تسجيل الصف: نحذف الملف حتى لا يبقى يتيمًا في التخزين.
    await supabase.storage.from('documents').remove([storagePath])
    return { ok: false, error: `تعذّر حفظ بيانات المستند: ${error.message}` }
  }

  await logAudit({
    action: 'upload',
    entity: 'documents',
    entityId: data.id,
    entityLabel: input.name,
    summary: `رفع مستند (${(file.size / 1024).toFixed(0)} ك.ب)`,
  })

  revalidatePath('/documents')
  if (input.caseId) revalidatePath(`/cases/${input.caseId}`)
  if (input.clientId) revalidatePath(`/clients/${input.clientId}`)
  return { ok: true, message: 'تم رفع المستند بنجاح.' }
}

/**
 * رابط موقّع مؤقت للعرض أو التحميل.
 * الحاوية خاصة: لا يمكن الوصول للملف إلا عبر رابط كهذا ينتهي بعد دقائق.
 */
export async function getDocumentUrlAction(
  id: string,
  mode: 'view' | 'download',
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const guard = await checkPermission('documents', mode === 'download' ? 'download' : 'view')
  if (!guard.ok) return { ok: false, error: guard.error }

  const supabase = await createClient()
  const { data: doc } = await supabase
    .from('documents')
    .select('storage_path, name, mime_type')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!doc) return { ok: false, error: 'المستند غير موجود أو لا تملك صلاحية عرضه.' }

  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(doc.storage_path, 300, // خمس دقائق
      mode === 'download' ? { download: doc.name } : undefined)

  if (error || !data) return { ok: false, error: `تعذّر إنشاء رابط الملف: ${error?.message ?? ''}` }

  await logAudit({
    action: mode === 'download' ? 'download' : 'view' as 'download',
    entity: 'documents',
    entityId: id,
    entityLabel: doc.name,
    summary: mode === 'download' ? 'تحميل مستند' : 'معاينة مستند',
  })

  return { ok: true, url: data.signedUrl }
}

const renameSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, 'الاسم مطلوب'),
  categoryId: z.string().uuid().optional().or(z.literal('')),
  description: z.string().trim().optional().or(z.literal('')),
})

export async function updateDocumentAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await checkPermission('documents', 'update')
  if (!guard.ok) return { ok: false, error: guard.error }

  const parsed = renameSchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    categoryId: nullable(formData.get('categoryId')),
    description: formData.get('description'),
  })

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('documents')
    .update({
      name: parsed.data.name,
      category_id: parsed.data.categoryId || null,
      description: parsed.data.description || null,
    })
    .eq('id', parsed.data.id)

  if (error) return { ok: false, error: `تعذّر حفظ التعديلات: ${error.message}` }

  await logAudit({
    action: 'update', entity: 'documents', entityId: parsed.data.id,
    entityLabel: parsed.data.name, summary: 'تعديل بيانات مستند',
  })

  revalidatePath('/documents')
  return { ok: true, message: 'تم حفظ التعديلات.' }
}

export async function deleteDocumentAction(id: string): Promise<ActionResult> {
  const guard = await checkPermission('documents', 'delete')
  if (!guard.ok) return { ok: false, error: guard.error }

  const supabase = await createClient()

  const { data: doc } = await supabase
    .from('documents').select('storage_path, name, case_id, client_id')
    .eq('id', id).maybeSingle()

  const { error } = await supabase.rpc('soft_delete', { _entity: 'documents', _id: id } as never)
  if (error) return { ok: false, error: `تعذّر حذف المستند: ${error.message}` }

  // الصف محذوف حذفًا ناعمًا، لكن الملف نفسه يُزال من التخزين
  // لأن الاحتفاظ به بلا مرجع يستهلك المساحة ويُبقي نسخة يصعب تتبّعها.
  if (doc?.storage_path) {
    await supabase.storage.from('documents').remove([doc.storage_path])
  }

  revalidatePath('/documents')
  if (doc?.case_id) revalidatePath(`/cases/${doc.case_id}`)
  if (doc?.client_id) revalidatePath(`/clients/${doc.client_id}`)
  return { ok: true, message: 'تم حذف المستند.' }
}
