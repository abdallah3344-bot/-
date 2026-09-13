'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkPermission } from '@/lib/auth/session'
import { logAudit, diffChanges } from '@/lib/audit'
import type { ActionResult } from '@/modules/auth/actions'

const optionalText = z.string().trim().optional().or(z.literal(''))

const settingsSchema = z.object({
  officeName: z.string().trim().min(2, 'اسم المكتب مطلوب'),
  officeAddress: optionalText,
  officePhone: optionalText,
  officeEmail: z
    .string().trim().optional().or(z.literal(''))
    .refine((v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'صيغة البريد غير صحيحة'),
  officeWebsite: optionalText,
  taxNumber: optionalText,
  currencyCode: z.string().trim().min(2, 'رمز العملة مطلوب').max(5),
  currencySymbol: z.string().trim().min(1, 'رمز العرض مطلوب').max(8),
  taxEnabled: z.boolean(),
  taxRate: z.coerce.number().min(0, 'النسبة لا تقل عن صفر').max(100, 'النسبة لا تتجاوز 100'),
  invoicePrefix: z.string().trim().min(1).max(10),
  receiptPrefix: z.string().trim().min(1).max(10),
  clientPrefix: z.string().trim().min(1).max(10),
  casePrefix: z.string().trim().min(1).max(10),
  invoiceNotes: optionalText,
  bankName: optionalText,
  bankAccountName: optionalText,
  bankAccountNumber: optionalText,
  bankIban: optionalText,
  backupFrequency: z.enum(['daily', 'weekly', 'monthly', 'off']),
})

export async function saveSettingsAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await checkPermission('settings', 'update')
  if (!guard.ok) return { ok: false, error: guard.error }

  const parsed = settingsSchema.safeParse({
    officeName: formData.get('officeName'),
    officeAddress: formData.get('officeAddress'),
    officePhone: formData.get('officePhone'),
    officeEmail: formData.get('officeEmail'),
    officeWebsite: formData.get('officeWebsite'),
    taxNumber: formData.get('taxNumber'),
    currencyCode: formData.get('currencyCode'),
    currencySymbol: formData.get('currencySymbol'),
    taxEnabled: formData.get('taxEnabled') === 'on' || formData.get('taxEnabled') === 'true',
    taxRate: formData.get('taxRate') || 0,
    invoicePrefix: formData.get('invoicePrefix'),
    receiptPrefix: formData.get('receiptPrefix'),
    clientPrefix: formData.get('clientPrefix'),
    casePrefix: formData.get('casePrefix'),
    invoiceNotes: formData.get('invoiceNotes'),
    bankName: formData.get('bankName'),
    bankAccountName: formData.get('bankAccountName'),
    bankAccountNumber: formData.get('bankAccountNumber'),
    bankIban: formData.get('bankIban'),
    backupFrequency: formData.get('backupFrequency'),
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

  const { data: before } = await supabase
    .from('settings')
    .select('office_name, currency_code, tax_enabled, tax_rate')
    .maybeSingle()

  const patch = {
    office_name: input.officeName,
    office_address: input.officeAddress || null,
    office_phone: input.officePhone || null,
    office_email: input.officeEmail || null,
    office_website: input.officeWebsite || null,
    tax_number: input.taxNumber || null,
    currency_code: input.currencyCode,
    currency_symbol: input.currencySymbol,
    tax_enabled: input.taxEnabled,
    tax_rate: input.taxRate,
    invoice_prefix: input.invoicePrefix,
    receipt_prefix: input.receiptPrefix,
    client_prefix: input.clientPrefix,
    case_prefix: input.casePrefix,
    invoice_notes: input.invoiceNotes || null,
    bank_name: input.bankName || null,
    bank_account_name: input.bankAccountName || null,
    bank_account_number: input.bankAccountNumber || null,
    bank_iban: input.bankIban || null,
    backup_frequency: input.backupFrequency,
    updated_by: guard.user.id,
  }

  const { error } = await supabase.from('settings').update(patch).eq('id', true)
  if (error) return { ok: false, error: `تعذّر حفظ الإعدادات: ${error.message}` }

  await logAudit({
    action: 'update',
    entity: 'settings',
    entityLabel: input.officeName,
    summary: 'تعديل إعدادات المكتب',
    changes: before ? diffChanges(before, patch) : null,
  })

  revalidatePath('/', 'layout')
  return { ok: true, message: 'تم حفظ الإعدادات بنجاح.' }
}

const LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
const LOGO_MAX = 2 * 1024 * 1024

export async function uploadLogoAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await checkPermission('settings', 'update')
  if (!guard.ok) return { ok: false, error: guard.error }

  const file = formData.get('logo')
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'اختر ملف الشعار.' }
  }
  if (!LOGO_TYPES.has(file.type)) {
    return { ok: false, error: 'صيغة الشعار غير مدعومة. المسموح: PNG أو JPG أو WEBP أو SVG.' }
  }
  if (file.size > LOGO_MAX) {
    return { ok: false, error: 'حجم الشعار يتجاوز 2 ميجابايت.' }
  }

  const supabase = await createClient()
  const extension = file.type === 'image/svg+xml' ? 'svg' : file.type.split('/')[1]
  const path = `logo-${Date.now()}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from('branding').upload(path, file, { contentType: file.type, upsert: true })

  if (uploadError) return { ok: false, error: `تعذّر رفع الشعار: ${uploadError.message}` }

  const { data: publicUrl } = supabase.storage.from('branding').getPublicUrl(path)

  const { error } = await supabase
    .from('settings')
    .update({ office_logo_url: publicUrl.publicUrl, updated_by: guard.user.id })
    .eq('id', true)

  if (error) return { ok: false, error: `تعذّر حفظ رابط الشعار: ${error.message}` }

  await logAudit({ action: 'update', entity: 'settings', summary: 'تغيير شعار المكتب' })

  revalidatePath('/', 'layout')
  return { ok: true, message: 'تم تحديث شعار المكتب.' }
}

// ---------------------------------------------------------------
// إدارة جداول المراجع (أنواع القضايا، المحاكم، التصنيفات…)
// ---------------------------------------------------------------

const LOOKUP_TABLES = new Set([
  'case_types', 'courts', 'document_categories', 'expense_categories',
])

export async function saveLookupAction(
  table: string,
  values: { id?: string; name_ar: string; extra?: Record<string, string | null> },
): Promise<ActionResult> {
  const guard = await checkPermission('settings', 'update')
  if (!guard.ok) return { ok: false, error: guard.error }

  if (!LOOKUP_TABLES.has(table)) {
    return { ok: false, error: 'جدول غير مدعوم.' }
  }
  if (!values.name_ar.trim()) {
    return { ok: false, error: 'الاسم مطلوب.' }
  }

  const supabase = await createClient()
  const row = { name_ar: values.name_ar.trim(), ...(values.extra ?? {}) }

  const { error } = values.id
    ? await supabase.from(table as 'case_types').update(row).eq('id', values.id)
    : await supabase.from(table as 'case_types').insert(row)

  if (error) {
    const message = error.message.includes('duplicate')
      ? 'هذا الاسم موجود مسبقًا.'
      : `تعذّر الحفظ: ${error.message}`
    return { ok: false, error: message }
  }

  await logAudit({
    action: values.id ? 'update' : 'create',
    entity: table,
    entityLabel: values.name_ar,
    summary: `${values.id ? 'تعديل' : 'إضافة'} في جدول المراجع`,
  })

  revalidatePath('/settings')
  return { ok: true, message: values.id ? 'تم الحفظ.' : 'تمت الإضافة.' }
}

export async function toggleLookupAction(
  table: string,
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  const guard = await checkPermission('settings', 'update')
  if (!guard.ok) return { ok: false, error: guard.error }

  if (!LOOKUP_TABLES.has(table)) return { ok: false, error: 'جدول غير مدعوم.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from(table as 'case_types').update({ is_active: isActive }).eq('id', id)

  if (error) return { ok: false, error: `تعذّر التحديث: ${error.message}` }

  revalidatePath('/settings')
  return { ok: true, message: isActive ? 'تم التفعيل.' : 'تم الإخفاء.' }
}
