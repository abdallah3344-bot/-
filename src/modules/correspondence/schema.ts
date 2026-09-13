import { z } from 'zod'
import { CORR_DIRECTIONS, CORR_PARTY_TYPES, CORR_STATUSES } from '@/lib/constants/enums'

const optionalText = z.string().trim().optional().or(z.literal(''))
const optionalUuid = z.string().uuid().optional().or(z.literal(''))

export const correspondenceSchema = z.object({
  direction: z.enum(CORR_DIRECTIONS, { message: 'اختر نوع المراسلة' }),
  partyType: z.enum(CORR_PARTY_TYPES, { message: 'اختر نوع الجهة' }),
  partyName: z.string().trim().min(2, 'اسم الجهة مطلوب'),
  subject: z.string().trim().min(3, 'موضوع المراسلة مطلوب'),
  body: optionalText,
  corrDate: z
    .string().trim().min(1, 'التاريخ مطلوب')
    .refine((v) => !Number.isNaN(Date.parse(v)), 'تاريخ غير صالح'),
  clientId: optionalUuid,
  caseId: optionalUuid,
  ownerId: optionalUuid,
  documentId: optionalUuid,
  status: z.enum(CORR_STATUSES, { message: 'اختر الحالة' }),
})
