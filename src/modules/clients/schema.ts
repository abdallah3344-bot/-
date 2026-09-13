import { z } from 'zod'
import { CLIENT_TYPES, CLIENT_STATUSES } from '@/lib/constants/enums'

const optionalText = z.string().trim().optional().or(z.literal(''))

export const clientSchema = z.object({
  name: z.string().trim().min(2, 'اسم العميل مطلوب (حرفان على الأقل)'),
  clientType: z.enum(CLIENT_TYPES, { message: 'اختر نوع العميل' }),
  nationalId: optionalText,
  phone: optionalText,
  whatsapp: optionalText,
  email: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'صيغة البريد الإلكتروني غير صحيحة'),
  address: optionalText,
  occupation: optionalText,
  fileOpenedAt: z
    .string()
    .trim()
    .min(1, 'تاريخ فتح الملف مطلوب')
    .refine((v) => !Number.isNaN(Date.parse(v)), 'تاريخ غير صالح'),
  responsibleLawyerId: z.string().uuid().optional().or(z.literal('')),
  status: z.enum(CLIENT_STATUSES, { message: 'اختر الحالة' }),
  notes: optionalText,
})

export const createClientSchema = clientSchema
export const updateClientSchema = clientSchema.extend({ id: z.string().uuid() })

export type ClientInput = z.infer<typeof clientSchema>
