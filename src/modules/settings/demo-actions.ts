'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { checkPermission } from '@/lib/auth/session'
import { logAudit } from '@/lib/audit'
import type { ActionResult } from '@/modules/auth/actions'

export async function seedDemoDataAction(): Promise<ActionResult> {
  const guard = await checkPermission('settings', 'update')
  if (!guard.ok) return { ok: false, error: guard.error }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('seed_demo_data')

  if (error) return { ok: false, error: `تعذّر توليد البيانات: ${error.message}` }

  const result = data as { ok?: boolean; message?: string } | null
  if (result && result.ok === false) {
    return { ok: false, error: result.message ?? 'البيانات التجريبية موجودة بالفعل.' }
  }

  await logAudit({
    action: 'create', entity: 'settings',
    summary: 'توليد بيانات تجريبية للاختبار',
  })

  revalidatePath('/', 'layout')
  return { ok: true, message: 'تم توليد البيانات التجريبية: 5 عملاء و5 قضايا بكل ما يتبعها.' }
}

export async function clearDemoDataAction(): Promise<ActionResult> {
  const guard = await checkPermission('settings', 'update')
  if (!guard.ok) return { ok: false, error: guard.error }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('clear_demo_data')

  if (error) return { ok: false, error: `تعذّر حذف البيانات: ${error.message}` }

  const removed = (data as { removed?: number } | null)?.removed ?? 0

  await logAudit({
    action: 'delete', entity: 'settings',
    summary: `حذف البيانات التجريبية (${removed} سجلًا)`,
  })

  revalidatePath('/', 'layout')
  return { ok: true, message: `تم حذف ${removed} سجلًا تجريبيًا. بياناتك الحقيقية لم تتأثر.` }
}
