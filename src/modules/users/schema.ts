import { z } from 'zod'

const passwordRules = z
  .string()
  .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
  .regex(/[a-z]/, 'يجب أن تحتوي على حرف صغير')
  .regex(/[A-Z]/, 'يجب أن تحتوي على حرف كبير')
  .regex(/[0-9]/, 'يجب أن تحتوي على رقم')

export const createUserSchema = z.object({
  fullName: z.string().trim().min(3, 'الاسم الكامل مطلوب (3 أحرف على الأقل)'),
  username: z
    .string()
    .trim()
    .min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل')
    .max(40, 'اسم المستخدم طويل جدًا')
    .regex(/^[a-zA-Z0-9._-]+$/, 'يُسمح بالحروف الإنجليزية والأرقام والنقطة والشرطة فقط'),
  email: z.string().trim().min(1, 'البريد الإلكتروني مطلوب').email('صيغة البريد غير صحيحة'),
  password: passwordRules,
  roleCode: z.string().trim().min(1, 'اختر الدور'),
  phone: z.string().trim().optional().or(z.literal('')),
  jobTitle: z.string().trim().optional().or(z.literal('')),
})

export const updateUserSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().trim().min(3, 'الاسم الكامل مطلوب (3 أحرف على الأقل)'),
  email: z.string().trim().min(1, 'البريد الإلكتروني مطلوب').email('صيغة البريد غير صحيحة'),
  roleCode: z.string().trim().min(1, 'اختر الدور'),
  phone: z.string().trim().optional().or(z.literal('')),
  jobTitle: z.string().trim().optional().or(z.literal('')),
  isActive: z.boolean(),
})

export const resetUserPasswordSchema = z.object({
  id: z.string().uuid(),
  password: passwordRules,
})

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(3, 'الاسم الكامل مطلوب (3 أحرف على الأقل)'),
  phone: z.string().trim().optional().or(z.literal('')),
  jobTitle: z.string().trim().optional().or(z.literal('')),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
