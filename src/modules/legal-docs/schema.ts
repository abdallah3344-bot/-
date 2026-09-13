import { z } from 'zod'
import { POA_TYPES, POA_STATUSES, CONTRACT_STATUSES } from '@/lib/constants/enums'

const optionalText = z.string().trim().optional().or(z.literal(''))
const optionalUuid = z.string().uuid().optional().or(z.literal(''))
const optionalDate = z
  .string().trim().optional().or(z.literal(''))
  .refine((v) => !v || !Number.isNaN(Date.parse(v)), 'تاريخ غير صالح')

export const poaSchema = z
  .object({
    clientId: z.string().uuid({ message: 'اختر العميل' }),
    caseId: optionalUuid,
    poaType: z.enum(POA_TYPES, { message: 'اختر نوع الوكالة' }),
    issuedAt: z
      .string().trim().min(1, 'تاريخ الوكالة مطلوب')
      .refine((v) => !Number.isNaN(Date.parse(v)), 'تاريخ غير صالح'),
    expiresAt: optionalDate,
    lawyerId: optionalUuid,
    status: z.enum(POA_STATUSES, { message: 'اختر الحالة' }),
    documentId: optionalUuid,
    notes: optionalText,
  })
  .refine((d) => !d.expiresAt || d.expiresAt >= d.issuedAt, {
    message: 'تاريخ الانتهاء يجب أن يكون بعد تاريخ الوكالة',
    path: ['expiresAt'],
  })

export const updatePoaSchema = poaSchema.safeExtend({ id: z.string().uuid() })

export const contractSchema = z
  .object({
    title: z.string().trim().min(3, 'اسم العقد مطلوب (3 أحرف على الأقل)'),
    clientId: z.string().uuid({ message: 'اختر العميل' }),
    counterparty: optionalText,
    contractType: optionalText,
    startDate: optionalDate,
    endDate: optionalDate,
    value: z
      .string().trim().optional().or(z.literal(''))
      .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= 0), 'القيمة يجب أن تكون رقمًا موجبًا'),
    lawyerId: optionalUuid,
    status: z.enum(CONTRACT_STATUSES, { message: 'اختر الحالة' }),
    documentId: optionalUuid,
    notes: optionalText,
  })
  .refine((d) => !d.endDate || !d.startDate || d.endDate >= d.startDate, {
    message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية',
    path: ['endDate'],
  })

export const updateContractSchema = contractSchema.safeExtend({ id: z.string().uuid() })
