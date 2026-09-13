'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import type { ActionResult } from '@/modules/auth/actions'

/** يولّد التنبيهات المستحقة للمستخدم الحالي. */
export async function generateNotificationsAction(): Promise<ActionResult & { count?: number }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'انتهت الجلسة.' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('generate_notifications')

  if (error) return { ok: false, error: `تعذّر توليد التنبيهات: ${error.message}` }

  revalidatePath('/notifications')
  revalidatePath('/', 'layout')
  return { ok: true, count: Number(data ?? 0) }
}

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'انتهت الجلسة.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { ok: false, error: `تعذّر تحديث التنبيه: ${error.message}` }

  revalidatePath('/notifications')
  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function markAllReadAction(): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'انتهت الجلسة.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('mark_all_notifications_read')

  if (error) return { ok: false, error: `تعذّر تحديث التنبيهات: ${error.message}` }

  revalidatePath('/notifications')
  revalidatePath('/', 'layout')
  return { ok: true, message: 'تم تعليم كل التنبيهات مقروءة.' }
}

export async function deleteNotificationAction(id: string): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'انتهت الجلسة.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('notifications').delete().eq('id', id).eq('user_id', user.id)

  if (error) return { ok: false, error: `تعذّر حذف التنبيه: ${error.message}` }

  revalidatePath('/notifications')
  revalidatePath('/', 'layout')
  return { ok: true }
}

const settingsSchema = z.object({
  hearingReminder: z.boolean(),
  hearingDaysBefore: z.coerce.number().int().min(0).max(90),
  taskReminder: z.boolean(),
  installmentReminder: z.boolean(),
  contractReminder: z.boolean(),
  contractDaysBefore: z.coerce.number().int().min(0).max(365),
  poaReminder: z.boolean(),
  poaDaysBefore: z.coerce.number().int().min(0).max(365),
  invoiceReminder: z.boolean(),
})

export async function saveNotificationSettingsAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'انتهت الجلسة.' }

  const on = (name: string) =>
    formData.get(name) === 'on' || formData.get(name) === 'true'

  const parsed = settingsSchema.safeParse({
    hearingReminder: on('hearingReminder'),
    hearingDaysBefore: formData.get('hearingDaysBefore') || 1,
    taskReminder: on('taskReminder'),
    installmentReminder: on('installmentReminder'),
    contractReminder: on('contractReminder'),
    contractDaysBefore: formData.get('contractDaysBefore') || 10,
    poaReminder: on('poaReminder'),
    poaDaysBefore: formData.get('poaDaysBefore') || 10,
    invoiceReminder: on('invoiceReminder'),
  })

  if (!parsed.success) {
    return { ok: false, error: 'قيم الأيام يجب أن تكون أعدادًا صحيحة ضمن المدى المسموح.' }
  }

  const input = parsed.data
  const supabase = await createClient()

  const { error } = await supabase
    .from('notification_settings')
    .upsert({
      user_id: user.id,
      hearing_reminder: input.hearingReminder,
      hearing_days_before: input.hearingDaysBefore,
      task_reminder: input.taskReminder,
      installment_reminder: input.installmentReminder,
      contract_reminder: input.contractReminder,
      contract_days_before: input.contractDaysBefore,
      poa_reminder: input.poaReminder,
      poa_days_before: input.poaDaysBefore,
      invoice_reminder: input.invoiceReminder,
    })

  if (error) return { ok: false, error: `تعذّر حفظ الإعدادات: ${error.message}` }

  revalidatePath('/notifications')
  return { ok: true, message: 'تم حفظ إعدادات التنبيهات.' }
}
