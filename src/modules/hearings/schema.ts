import { z } from 'zod'
import { HEARING_TYPES, HEARING_STATUSES } from '@/lib/constants/enums'

const optionalText = z.string().trim().optional().or(z.literal(''))
const optionalUuid = z.string().uuid().optional().or(z.literal(''))
const optionalDate = z
  .string().trim().optional().or(z.literal(''))
  .refine((v) => !v || !Number.isNaN(Date.parse(v)), 'تاريخ غير صالح')

export const hearingSchema = z
  .object({
    caseId: z.string().uuid({ message: 'اختر القضية' }),
    courtId: optionalUuid,
    chamberId: optionalUuid,
    judgeId: optionalUuid,
    hearingDate: z
      .string().trim().min(1, 'تاريخ الجلسة مطلوب')
      .refine((v) => !Number.isNaN(Date.parse(v)), 'تاريخ غير صالح'),
    hearingTime: optionalText,
    room: optionalText,
    assignedLawyerId: optionalUuid,
    hearingType: z.enum(HEARING_TYPES, { message: 'اختر نوع الجلسة' }),
    requiredAction: optionalText,
    result: optionalText,
    decision: optionalText,
    notes: optionalText,
    nextHearingDate: optionalDate,
    status: z.enum(HEARING_STATUSES, { message: 'اختر الحالة' }),
  })
  .refine(
    (d) => !d.nextHearingDate || d.nextHearingDate >= d.hearingDate,
    { message: 'موعد الجلسة القادمة يجب أن يكون بعد تاريخ هذه الجلسة', path: ['nextHearingDate'] },
  )

export const updateHearingSchema = hearingSchema.safeExtend({ id: z.string().uuid() })

export type HearingInput = z.infer<typeof hearingSchema>
