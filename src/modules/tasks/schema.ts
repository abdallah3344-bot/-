import { z } from 'zod'
import { TASK_STATUSES, PRIORITIES } from '@/lib/constants/enums'

const optionalText = z.string().trim().optional().or(z.literal(''))
const optionalUuid = z.string().uuid().optional().or(z.literal(''))

export const taskSchema = z.object({
  title: z.string().trim().min(3, 'عنوان المهمة مطلوب (3 أحرف على الأقل)'),
  description: optionalText,
  caseId: optionalUuid,
  clientId: optionalUuid,
  assigneeId: optionalUuid,
  dueDate: z
    .string().trim().optional().or(z.literal(''))
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), 'تاريخ غير صالح'),
  priority: z.enum(PRIORITIES, { message: 'اختر الأولوية' }),
  status: z.enum(TASK_STATUSES, { message: 'اختر الحالة' }),
  notes: optionalText,
})

export const updateTaskSchema = taskSchema.safeExtend({ id: z.string().uuid() })
export type TaskInput = z.infer<typeof taskSchema>
