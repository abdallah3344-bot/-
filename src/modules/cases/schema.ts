import { z } from 'zod'
import { CASE_STATUSES, PRIORITIES, LITIGATION_DEGREES } from '@/lib/constants/enums'

const optionalText = z.string().trim().optional().or(z.literal(''))
const optionalUuid = z.string().uuid().optional().or(z.literal(''))
const optionalDate = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))
  .refine((v) => !v || !Number.isNaN(Date.parse(v)), 'تاريخ غير صالح')

export const caseSchema = z.object({
  title: z.string().trim().min(3, 'اسم القضية مطلوب (3 أحرف على الأقل)'),
  clientId: z.string().uuid({ message: 'اختر العميل' }),
  courtCaseNo: optionalText,
  responsibleLawyerId: optionalUuid,
  assistantLawyerId: optionalUuid,
  caseTypeId: optionalUuid,
  courtId: optionalUuid,
  chamberId: optionalUuid,
  judgeId: optionalUuid,
  governorate: optionalText,
  registeredAt: optionalDate,
  firstHearingAt: optionalDate,
  litigationDegree: z.enum(LITIGATION_DEGREES).optional().or(z.literal('')),
  claimAmount: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= 0), 'قيمة المطالبة يجب أن تكون رقمًا موجبًا'),
  priority: z.enum(PRIORITIES, { message: 'اختر الأولوية' }),
  status: z.enum(CASE_STATUSES, { message: 'اختر الحالة' }),
  description: optionalText,
  notes: optionalText,
})

export const createCaseSchema = caseSchema
export const updateCaseSchema = caseSchema.extend({ id: z.string().uuid() })

export const opponentSchema = z.object({
  caseId: z.string().uuid(),
  name: z.string().trim().min(2, 'اسم الخصم مطلوب'),
  nationalId: optionalText,
  phone: optionalText,
  address: optionalText,
  lawyerName: optionalText,
  lawyerPhone: optionalText,
  notes: optionalText,
})

export const closeCaseSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().trim().min(3, 'سبب الإغلاق مطلوب'),
})

export type CaseInput = z.infer<typeof caseSchema>
export type OpponentInput = z.infer<typeof opponentSchema>
