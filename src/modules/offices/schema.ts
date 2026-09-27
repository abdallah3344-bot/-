import { z } from 'zod'

/** تسجيل مكتب جديد — القاعدة تعيد التحقق نفسه، هذا للرسائل الفورية. */
export const registerOfficeSchema = z
  .object({
    officeName: z.string().trim().min(2, 'أدخل اسم المكتب').max(120, 'الاسم طويل جدًا'),
    fullName: z.string().trim().min(2, 'أدخل اسم مدير المكتب'),
    phone: z
      .string()
      .trim()
      .transform((v) => v.replace(/[^0-9+]/g, ''))
      .pipe(z.string().min(9, 'رقم الجوال غير صحيح')),
    username: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9._-]{3,40}$/, 'أحرف إنجليزية أو أرقام، 3 على الأقل، بلا مسافات'),
    email: z.string().trim().toLowerCase().email('صيغة البريد الإلكتروني غير صحيحة'),
    password: z
      .string()
      .min(8, 'كلمة المرور 8 أحرف على الأقل')
      .regex(/[a-z]/, 'يجب أن تحتوي على حرف صغير')
      .regex(/[A-Z]/, 'يجب أن تحتوي على حرف كبير')
      .regex(/[0-9]/, 'يجب أن تحتوي على رقم'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'كلمتا المرور غير متطابقتين',
  })

export const officeSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^([a-z0-9][a-z0-9-]{1,38}[a-z0-9])?$/, 'أحرف إنجليزية صغيرة وأرقام وشرطة، 3 أحرف على الأقل')
