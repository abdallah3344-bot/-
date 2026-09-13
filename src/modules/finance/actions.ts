'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { checkPermission } from '@/lib/auth/session'
import { logAudit } from '@/lib/audit'
import {
  caseFeeSchema, invoiceSchema, paymentSchema, expenseSchema, accountSchema,
} from './schema'
import type { ActionResult } from '@/modules/auth/actions'

function fieldErrorsOf(issues: { path: (string | number | symbol)[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {}
  for (const issue of issues) {
    const key = issue.path.join('.')
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message
    const first = issue.path[0]
    if (typeof first === 'string' && !fieldErrors[first]) fieldErrors[first] = issue.message
  }
  return fieldErrors
}

function nullable(value: FormDataEntryValue | null): string {
  const text = typeof value === 'string' ? value : ''
  return text === '__none__' ? '' : text
}

// ===============================================================
// الأتعاب
// ===============================================================

export async function saveCaseFeeAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await checkPermission('fees', 'create')
  if (!guard.ok) return { ok: false, error: guard.error }

  const parsed = caseFeeSchema.safeParse({
    caseId: nullable(formData.get('caseId')),
    totalAmount: formData.get('totalAmount'),
    advanceAmount: formData.get('advanceAmount'),
    installmentsCount: formData.get('installmentsCount'),
    firstDueDate: formData.get('firstDueDate'),
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

  const total = Number(input.totalAmount)
  const advance = Number(input.advanceAmount || 0)
  const count = Number(input.installmentsCount || 0)
  const remaining = total - advance
  const installmentAmount = count > 0 ? Math.round((remaining / count) * 100) / 100 : 0

  // الأتعاب علاقة واحد-لواحد مع القضية، فنُحدّث إن وُجدت
  const { data: existing } = await supabase
    .from('case_fees').select('id').eq('case_id', input.caseId).maybeSingle()

  const row = {
    case_id: input.caseId,
    total_amount: total,
    advance_amount: advance,
    installments_count: count,
    installment_amount: installmentAmount,
    notes: input.notes || null,
  }

  const { data: fee, error } = existing
    ? await supabase.from('case_fees').update(row).eq('id', existing.id).select('id').single()
    : await supabase.from('case_fees')
        .insert({ ...row, created_by: guard.user.id }).select('id').single()

  if (error) return { ok: false, error: `تعذّر حفظ الأتعاب: ${error.message}` }

  // إعادة توليد جدول الأقساط
  await supabase.from('fee_installments').delete().eq('case_fee_id', fee.id)

  if (count > 0 && input.firstDueDate) {
    const start = new Date(input.firstDueDate)
    const rows = Array.from({ length: count }, (_, i) => {
      const due = new Date(start)
      due.setMonth(due.getMonth() + i)
      // آخر قسط يحمل فروق التقريب حتى يساوي المجموع المتبقي تمامًا
      const amount = i === count - 1
        ? Math.round((remaining - installmentAmount * (count - 1)) * 100) / 100
        : installmentAmount
      return {
        case_fee_id: fee.id,
        seq: i + 1,
        amount,
        due_date: due.toISOString().slice(0, 10),
        status: 'pending',
      }
    })

    const { error: installmentError } = await supabase.from('fee_installments').insert(rows)
    if (installmentError) {
      return { ok: false, error: `تعذّر إنشاء الأقساط: ${installmentError.message}` }
    }
  }

  await logAudit({
    action: 'create', entity: 'case_fees', entityId: fee.id,
    summary: `تسجيل أتعاب بقيمة ${total}${count > 0 ? ` على ${count} أقساط` : ''}`,
  })

  revalidatePath('/fees')
  revalidatePath(`/cases/${input.caseId}`)
  return {
    ok: true,
    message: count > 0
      ? `تم حفظ الأتعاب وتوليد ${count} قسطًا.`
      : 'تم حفظ الأتعاب.',
  }
}

// ===============================================================
// الفواتير
// ===============================================================

export async function saveInvoiceAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult & { id?: string }> {
  const id = formData.get('id')
  const isEdit = typeof id === 'string' && id.length > 0

  const guard = await checkPermission('invoices', isEdit ? 'update' : 'create')
  if (!guard.ok) return { ok: false, error: guard.error }

  // البنود تصل كمصفوفة JSON من النموذج
  let items: unknown = []
  try {
    items = JSON.parse(String(formData.get('items') ?? '[]'))
  } catch {
    return { ok: false, error: 'تعذّر قراءة بنود الفاتورة.' }
  }

  const parsed = invoiceSchema.safeParse({
    clientId: nullable(formData.get('clientId')),
    caseId: nullable(formData.get('caseId')),
    issueDate: formData.get('issueDate'),
    dueDate: formData.get('dueDate'),
    discount: formData.get('discount'),
    taxRate: formData.get('taxRate'),
    status: formData.get('status'),
    notes: formData.get('notes'),
    items,
  })

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.find((i) => i.path[0] === 'items')?.message
             ?? 'يرجى تصحيح الحقول المحدّدة.',
      fieldErrors: fieldErrorsOf(parsed.error.issues),
    }
  }

  const input = parsed.data
  const supabase = await createClient()

  // الخصم لا يتجاوز المجموع الفرعي. نتحقّق هنا لنُعطي رسالة واضحة؛
  // ويضمن محفّز إعادة الاحتساب في القاعدة الثبات نفسه بعد استقرار البنود،
  // لأن قيد CHECK لا يصلح: رأس الفاتورة يُدرج قبل بنودها فيكون المجموع صفرًا.
  const subtotal = input.items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0)

  if (Number(input.discount || 0) > subtotal) {
    return {
      ok: false,
      error: `الخصم (${Number(input.discount).toFixed(2)}) لا يمكن أن يتجاوز المجموع الفرعي (${subtotal.toFixed(2)}).`,
      fieldErrors: { discount: 'الخصم أكبر من المجموع الفرعي' },
    }
  }

  const header = {
    client_id: input.clientId,
    case_id: input.caseId || null,
    issue_date: input.issueDate,
    due_date: input.dueDate || null,
    discount: Number(input.discount || 0),
    tax_rate: Number(input.taxRate || 0),
    status: input.status,
    notes: input.notes || null,
  }

  const { data: invoice, error } = isEdit
    ? await supabase.from('invoices').update(header).eq('id', id as string)
        .select('id, invoice_no').single()
    : await supabase.from('invoices').insert({ ...header, created_by: guard.user.id })
        .select('id, invoice_no').single()

  if (error) return { ok: false, error: `تعذّر حفظ الفاتورة: ${error.message}` }

  // البنود تُستبدل بالكامل، والمحفّزات تُعيد احتساب الإجماليات
  await supabase.from('invoice_items').delete().eq('invoice_id', invoice.id)

  const itemRows = input.items.map((item, index) => {
    const quantity = Number(item.quantity)
    const unitPrice = Number(item.unitPrice)
    return {
      invoice_id: invoice.id,
      description: item.description,
      quantity,
      unit_price: unitPrice,
      line_total: Math.round(quantity * unitPrice * 100) / 100,
      sort_order: index,
    }
  })

  const { error: itemsError } = await supabase.from('invoice_items').insert(itemRows)
  if (itemsError) return { ok: false, error: `تعذّر حفظ بنود الفاتورة: ${itemsError.message}` }

  await logAudit({
    action: isEdit ? 'update' : 'create',
    entity: 'invoices',
    entityId: invoice.id,
    entityLabel: invoice.invoice_no,
    summary: isEdit ? 'تعديل فاتورة' : `إصدار فاتورة ${invoice.invoice_no}`,
  })

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${invoice.id}`)
  if (input.caseId) revalidatePath(`/cases/${input.caseId}`)
  return {
    ok: true,
    message: isEdit ? 'تم حفظ الفاتورة.' : `تم إصدار الفاتورة ${invoice.invoice_no}.`,
    id: invoice.id,
  }
}

export async function deleteInvoiceAction(id: string): Promise<ActionResult> {
  const guard = await checkPermission('invoices', 'delete')
  if (!guard.ok) return { ok: false, error: guard.error }

  const supabase = await createClient()

  // لا نحذف فاتورة عليها مقبوضات: ذلك يفقد أثر المبالغ المستلمة.
  const { count } = await supabase
    .from('payments').select('id', { count: 'exact', head: true })
    .eq('invoice_id', id).is('deleted_at', null)

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `لا يمكن حذف فاتورة مسجّل عليها ${count} دفعة. احذف الدفعات أولًا أو ألغِ الفاتورة.`,
    }
  }

  const { error } = await supabase.rpc('soft_delete', { _entity: 'invoices', _id: id } as never)
  if (error) return { ok: false, error: `تعذّر حذف الفاتورة: ${error.message}` }

  revalidatePath('/invoices')
  return { ok: true, message: 'تم حذف الفاتورة.' }
}

// ===============================================================
// المقبوضات
// ===============================================================

export async function savePaymentAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const id = formData.get('id')
  const isEdit = typeof id === 'string' && id.length > 0

  const guard = await checkPermission('payments', isEdit ? 'update' : 'create')
  if (!guard.ok) return { ok: false, error: guard.error }

  const parsed = paymentSchema.safeParse({
    clientId: nullable(formData.get('clientId')),
    caseId: nullable(formData.get('caseId')),
    invoiceId: nullable(formData.get('invoiceId')),
    accountId: nullable(formData.get('accountId')),
    amount: formData.get('amount'),
    method: formData.get('method'),
    referenceNo: formData.get('referenceNo'),
    paidAt: formData.get('paidAt'),
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
  const amount = Number(input.amount)

  // لا تتجاوز الدفعة المتبقي على الفاتورة
  if (input.invoiceId) {
    const { data: invoice } = await supabase
      .from('invoices').select('total, paid_amount, invoice_no')
      .eq('id', input.invoiceId).maybeSingle()

    if (invoice) {
      const outstanding = Number(invoice.total ?? 0) - Number(invoice.paid_amount ?? 0)
      const tolerance = 0.01
      if (!isEdit && amount > outstanding + tolerance) {
        return {
          ok: false,
          error: `المبلغ يتجاوز المتبقي على الفاتورة ${invoice.invoice_no} (${outstanding.toFixed(2)}).`,
          fieldErrors: { amount: 'المبلغ أكبر من المتبقي' },
        }
      }
    }
  }

  const row = {
    client_id: input.clientId,
    case_id: input.caseId || null,
    invoice_id: input.invoiceId || null,
    account_id: input.accountId || null,
    amount,
    method: input.method,
    reference_no: input.referenceNo || null,
    paid_at: input.paidAt,
    notes: input.notes || null,
    received_by: guard.user.id,
  }

  const { data, error } = isEdit
    ? await supabase.from('payments').update(row).eq('id', id as string)
        .select('id, receipt_no').single()
    : await supabase.from('payments').insert({ ...row, created_by: guard.user.id })
        .select('id, receipt_no').single()

  if (error) return { ok: false, error: `تعذّر حفظ الدفعة: ${error.message}` }

  await logAudit({
    action: isEdit ? 'update' : 'create',
    entity: 'payments',
    entityId: data.id,
    entityLabel: data.receipt_no,
    summary: `${isEdit ? 'تعديل' : 'تسجيل'} دفعة بمبلغ ${amount}`,
  })

  revalidatePath('/payments')
  revalidatePath('/invoices')
  revalidatePath('/accounts')
  if (input.caseId) revalidatePath(`/cases/${input.caseId}`)
  return {
    ok: true,
    message: isEdit ? 'تم حفظ الدفعة.' : `تم تسجيل الدفعة بإيصال ${data.receipt_no}.`,
  }
}

export async function deletePaymentAction(id: string): Promise<ActionResult> {
  const guard = await checkPermission('payments', 'delete')
  if (!guard.ok) return { ok: false, error: guard.error }

  const supabase = await createClient()
  const { error } = await supabase.rpc('soft_delete', { _entity: 'payments', _id: id } as never)
  if (error) return { ok: false, error: `تعذّر حذف الدفعة: ${error.message}` }

  revalidatePath('/payments')
  revalidatePath('/invoices')
  revalidatePath('/accounts')
  return { ok: true, message: 'تم حذف الدفعة وأُعيد احتساب الفاتورة.' }
}

// ===============================================================
// المصروفات
// ===============================================================

export async function saveExpenseAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const id = formData.get('id')
  const isEdit = typeof id === 'string' && id.length > 0

  const guard = await checkPermission('expenses', isEdit ? 'update' : 'create')
  if (!guard.ok) return { ok: false, error: guard.error }

  const parsed = expenseSchema.safeParse({
    caseId: nullable(formData.get('caseId')),
    clientId: nullable(formData.get('clientId')),
    categoryId: nullable(formData.get('categoryId')),
    accountId: nullable(formData.get('accountId')),
    amount: formData.get('amount'),
    spentAt: formData.get('spentAt'),
    description: formData.get('description'),
    receiptRef: formData.get('receiptRef'),
    isBillable: formData.get('isBillable') === 'on' || formData.get('isBillable') === 'true',
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

  const row = {
    case_id: input.caseId || null,
    client_id: input.clientId || null,
    category_id: input.categoryId || null,
    account_id: input.accountId || null,
    amount: Number(input.amount),
    spent_at: input.spentAt,
    description: input.description || null,
    receipt_ref: input.receiptRef || null,
    is_billable: input.isBillable,
  }

  const { error } = isEdit
    ? await supabase.from('expenses').update(row).eq('id', id as string)
    : await supabase.from('expenses').insert({ ...row, created_by: guard.user.id })

  if (error) return { ok: false, error: `تعذّر حفظ المصروف: ${error.message}` }

  await logAudit({
    action: isEdit ? 'update' : 'create',
    entity: 'expenses',
    entityId: isEdit ? (id as string) : null,
    summary: `${isEdit ? 'تعديل' : 'تسجيل'} مصروف بمبلغ ${input.amount}`,
  })

  revalidatePath('/expenses')
  revalidatePath('/accounts')
  if (input.caseId) revalidatePath(`/cases/${input.caseId}`)
  return { ok: true, message: isEdit ? 'تم حفظ المصروف.' : 'تم تسجيل المصروف.' }
}

export async function deleteExpenseAction(id: string): Promise<ActionResult> {
  const guard = await checkPermission('expenses', 'delete')
  if (!guard.ok) return { ok: false, error: guard.error }

  const supabase = await createClient()
  const { error } = await supabase.rpc('soft_delete', { _entity: 'expenses', _id: id } as never)
  if (error) return { ok: false, error: `تعذّر حذف المصروف: ${error.message}` }

  revalidatePath('/expenses')
  revalidatePath('/accounts')
  return { ok: true, message: 'تم حذف المصروف.' }
}

// ===============================================================
// الحسابات
// ===============================================================

export async function saveAccountAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const id = formData.get('id')
  const isEdit = typeof id === 'string' && id.length > 0

  const guard = await checkPermission('accounts', isEdit ? 'update' : 'create')
  if (!guard.ok) return { ok: false, error: guard.error }

  const parsed = accountSchema.safeParse({
    name: formData.get('name'),
    accountType: formData.get('accountType'),
    bankName: formData.get('bankName'),
    accountNumber: formData.get('accountNumber'),
    iban: formData.get('iban'),
    openingBalance: formData.get('openingBalance'),
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

  const row = {
    name: input.name,
    account_type: input.accountType,
    bank_name: input.bankName || null,
    account_number: input.accountNumber || null,
    iban: input.iban || null,
    opening_balance: Number(input.openingBalance || 0),
  }

  const { error } = isEdit
    ? await supabase.from('accounts').update(row).eq('id', id as string)
    : await supabase.from('accounts').insert(row)

  if (error) return { ok: false, error: `تعذّر حفظ الحساب: ${error.message}` }

  await logAudit({
    action: isEdit ? 'update' : 'create',
    entity: 'accounts',
    entityId: isEdit ? (id as string) : null,
    entityLabel: input.name,
    summary: isEdit ? 'تعديل حساب' : 'إضافة حساب',
  })

  revalidatePath('/accounts')
  return { ok: true, message: isEdit ? 'تم حفظ الحساب.' : 'تمت إضافة الحساب.' }
}
