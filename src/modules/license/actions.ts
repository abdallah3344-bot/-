'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkPermission } from '@/lib/auth/session'
import { logAudit } from '@/lib/audit'
import type { ActionResult } from '@/modules/auth/actions'
import { callVerifyLicense, getLicenseInputs } from './service'
import { LICENSE_STATE_LABELS, VALID_STATES } from './constants'

const activateSchema = z.object({
  licenseKey: z.string().trim().min(6, 'مفتاح الترخيص قصير جدًا').max(120),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
})

const trialSchema = z.object({
  phone: z.string().trim().min(7, 'رقم الجوال مطلوب').max(30),
  clientName: z.string().trim().min(2, 'اسم المكتب مطلوب').max(120),
})

/** حالات تعني أن التفعيل انطلق فعلًا وإن لم يكتمل بعد — نحفظ مدخلاتها. */
const PERSISTABLE = [...VALID_STATES, 'device_pending', 'trial_pending'] as readonly string[]

function describe(state: string, message: string | null | undefined): string {
  return message ?? LICENSE_STATE_LABELS[state] ?? 'تعذّر إتمام التفعيل.'
}

export async function activateLicenseAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await checkPermission('settings', 'update')
  if (!guard.ok) return { ok: false, error: guard.error }

  const parsed = activateSchema.safeParse({
    licenseKey: formData.get('licenseKey'),
    phone: formData.get('phone'),
  })

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return { ok: false, error: 'يرجى تصحيح الحقول المحدّدة.', fieldErrors }
  }

  const inputs = await getLicenseInputs()
  if (!inputs) return { ok: false, error: 'تعذّر قراءة حالة الترخيص.' }

  const phone = parsed.data.phone?.trim() || null
  const result = await callVerifyLicense({
    deviceId: inputs.deviceId,
    licenseKey: parsed.data.licenseKey,
    phone,
  })

  if (!result.ok) return { ok: false, error: result.error }

  const state = result.data.state ?? 'unknown'
  const message = describe(state, result.data.message)

  if (!PERSISTABLE.includes(state)) {
    await recordCheck(state, message)
    return { ok: false, error: message }
  }

  // الخادم قد يردّ بمفتاح مختلف بعد تدويره — نحفظ ما أقرّه هو.
  const supabase = await createClient()
  const { error } = await supabase
    .from('license_state')
    .update({
      license_key: result.data.licenseKey ?? parsed.data.licenseKey,
      phone,
      activated_at: new Date().toISOString(),
      activated_by: guard.user.id,
      last_state: state,
      last_message: message,
      last_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', true)

  if (error) return { ok: false, error: 'تعذّر حفظ بيانات الترخيص.' }

  await logAudit({
    action: 'license_activate',
    entity: 'license',
    summary: `تفعيل الترخيص — الحالة: ${LICENSE_STATE_LABELS[state] ?? state}`,
  })

  revalidatePath('/', 'layout')

  return (VALID_STATES as readonly string[]).includes(state)
    ? { ok: true, message: 'تم تفعيل الترخيص بنجاح.' }
    : { ok: true, message }
}

export async function requestTrialAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await checkPermission('settings', 'update')
  if (!guard.ok) return { ok: false, error: guard.error }

  const parsed = trialSchema.safeParse({
    phone: formData.get('phone'),
    clientName: formData.get('clientName'),
  })

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return { ok: false, error: 'يرجى تصحيح الحقول المحدّدة.', fieldErrors }
  }

  const inputs = await getLicenseInputs()
  if (!inputs) return { ok: false, error: 'تعذّر قراءة حالة الترخيص.' }

  // بلا مفتاح: خادم التراخيص ينشئ طلبًا تجريبيًا ويربطه بهذه النسخة.
  const result = await callVerifyLicense({
    deviceId: inputs.deviceId,
    licenseKey: null,
    phone: parsed.data.phone,
    clientName: parsed.data.clientName,
  })

  if (!result.ok) return { ok: false, error: result.error }

  const state = result.data.state ?? 'unknown'
  const message = describe(state, result.data.message)

  if (!PERSISTABLE.includes(state)) {
    await recordCheck(state, message)
    return { ok: false, error: message }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('license_state')
    .update({
      license_key: result.data.licenseKey ?? null,
      phone: parsed.data.phone,
      client_name: parsed.data.clientName,
      activated_at: new Date().toISOString(),
      activated_by: guard.user.id,
      last_state: state,
      last_message: message,
      last_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', true)

  if (error) return { ok: false, error: 'تعذّر حفظ بيانات الطلب.' }

  await logAudit({
    action: 'license_trial_request',
    entity: 'license',
    summary: `طلب نسخة تجريبية — الحالة: ${LICENSE_STATE_LABELS[state] ?? state}`,
  })

  revalidatePath('/', 'layout')
  return { ok: true, message }
}

/** إعادة سؤال خادم التراخيص الآن — لالتقاط موافقة صدرت من اللوحة. */
export async function refreshLicenseAction(): Promise<ActionResult> {
  const user = await checkPermission('settings', 'view')
  if (!user.ok) return { ok: false, error: user.error }

  const inputs = await getLicenseInputs()
  if (!inputs) return { ok: false, error: 'تعذّر قراءة حالة الترخيص.' }

  const result = await callVerifyLicense({
    deviceId: inputs.deviceId,
    licenseKey: inputs.licenseKey,
    phone: inputs.phone,
    clientName: inputs.clientName,
  })

  if (!result.ok) return { ok: false, error: result.error }

  const state = result.data.state ?? 'unknown'
  const message = describe(state, result.data.message)
  await recordCheck(state, message)
  revalidatePath('/', 'layout')

  return (VALID_STATES as readonly string[]).includes(state)
    ? { ok: true, message: 'الترخيص سارٍ.' }
    : { ok: false, error: message }
}

/** تسجيل آخر نتيجة للعرض فقط — لا يُبنى عليها قرار سماح. */
async function recordCheck(state: string, message: string): Promise<void> {
  const supabase = await createClient()
  await supabase.rpc('touch_license_state', { p_state: state, p_message: message })
}
