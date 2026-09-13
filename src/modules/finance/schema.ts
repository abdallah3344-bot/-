import { z } from 'zod'
import { PAYMENT_METHODS, INVOICE_STATUSES } from '@/lib/constants/enums'

const optionalText = z.string().trim().optional().or(z.literal(''))
const optionalUuid = z.string().uuid().optional().or(z.literal(''))

const money = (message: string) =>
  z.string().trim().refine((v) => v !== '' && !Number.isNaN(Number(v)) && Number(v) >= 0, message)

const optionalMoney = z
  .string().trim().optional().or(z.literal(''))
  .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= 0), 'المبلغ يجب أن يكون رقمًا موجبًا')

// ---------------- الأتعاب ----------------
export const caseFeeSchema = z
  .object({
    caseId: z.string().uuid({ message: 'اختر القضية' }),
    totalAmount: money('قيمة الأتعاب مطلوبة ويجب أن تكون رقمًا موجبًا'),
    advanceAmount: optionalMoney,
    installmentsCount: z
      .string().trim().optional().or(z.literal(''))
      .refine((v) => !v || (Number.isInteger(Number(v)) && Number(v) >= 0), 'عدد الأقساط يجب أن يكون عددًا صحيحًا'),
    firstDueDate: z
      .string().trim().optional().or(z.literal(''))
      .refine((v) => !v || !Number.isNaN(Date.parse(v)), 'تاريخ غير صالح'),
    notes: optionalText,
  })
  .refine((d) => Number(d.advanceAmount || 0) <= Number(d.totalAmount), {
    message: 'الدفعة المقدمة لا يمكن أن تتجاوز إجمالي الأتعاب',
    path: ['advanceAmount'],
  })

// ---------------- الفواتير ----------------
export const invoiceItemSchema = z.object({
  description: z.string().trim().min(1, 'وصف البند مطلوب'),
  quantity: z.string().trim().refine((v) => Number(v) > 0, 'الكمية يجب أن تكون أكبر من صفر'),
  unitPrice: money('سعر الوحدة مطلوب'),
})

export const invoiceSchema = z.object({
  clientId: z.string().uuid({ message: 'اختر العميل' }),
  caseId: optionalUuid,
  issueDate: z
    .string().trim().min(1, 'تاريخ الإصدار مطلوب')
    .refine((v) => !Number.isNaN(Date.parse(v)), 'تاريخ غير صالح'),
  dueDate: z
    .string().trim().optional().or(z.literal(''))
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), 'تاريخ غير صالح'),
  discount: optionalMoney,
  taxRate: z
    .string().trim().optional().or(z.literal(''))
    .refine((v) => !v || (Number(v) >= 0 && Number(v) <= 100), 'نسبة الضريبة بين 0 و100'),
  status: z.enum(INVOICE_STATUSES, { message: 'اختر الحالة' }),
  notes: optionalText,
  items: z.array(invoiceItemSchema).min(1, 'أضف بندًا واحدًا على الأقل'),
})

// ---------------- المقبوضات ----------------
export const paymentSchema = z.object({
  clientId: z.string().uuid({ message: 'اختر العميل' }),
  caseId: optionalUuid,
  invoiceId: optionalUuid,
  accountId: optionalUuid,
  amount: money('المبلغ مطلوب ويجب أن يكون أكبر من صفر'),
  method: z.enum(PAYMENT_METHODS, { message: 'اختر طريقة الدفع' }),
  referenceNo: optionalText,
  paidAt: z
    .string().trim().min(1, 'تاريخ القبض مطلوب')
    .refine((v) => !Number.isNaN(Date.parse(v)), 'تاريخ غير صالح'),
  notes: optionalText,
}).refine((d) => Number(d.amount) > 0, {
  message: 'المبلغ يجب أن يكون أكبر من صفر',
  path: ['amount'],
})

// ---------------- المصروفات ----------------
export const expenseSchema = z.object({
  caseId: optionalUuid,
  clientId: optionalUuid,
  categoryId: optionalUuid,
  accountId: optionalUuid,
  amount: money('المبلغ مطلوب ويجب أن يكون أكبر من صفر'),
  spentAt: z
    .string().trim().min(1, 'تاريخ الصرف مطلوب')
    .refine((v) => !Number.isNaN(Date.parse(v)), 'تاريخ غير صالح'),
  description: optionalText,
  receiptRef: optionalText,
  isBillable: z.boolean(),
}).refine((d) => Number(d.amount) > 0, {
  message: 'المبلغ يجب أن يكون أكبر من صفر',
  path: ['amount'],
})

// ---------------- الحسابات ----------------
export const accountSchema = z.object({
  name: z.string().trim().min(2, 'اسم الحساب مطلوب'),
  accountType: z.enum(['cash', 'bank'], { message: 'اختر نوع الحساب' }),
  bankName: optionalText,
  accountNumber: optionalText,
  iban: optionalText,
  openingBalance: optionalMoney,
})
