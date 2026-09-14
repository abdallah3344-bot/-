import 'server-only'

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { LICENSE_PROGRAM, VALID_STATES } from './constants'

/** الرد الخام من دالة verify_license في لوحة التراخيص. */
type VerifyResponse = {
  ok?: boolean
  state?: string
  message?: string
  licenseKey?: string
  licenseType?: string
  startDate?: string | null
  expiresAt?: string | null
  daysRemaining?: number | null
  isLifetime?: boolean
}

export type LicenseStatus = {
  /** هل يُسمح بتشغيل النظام الآن. */
  allowed: boolean
  state: string
  message: string | null
  licenseType: string | null
  expiresAt: string | null
  daysRemaining: number | null
  isLifetime: boolean
  /** المفتاح كما يعرفه خادم التراخيص (قد يختلف بعد تدوير المفتاح). */
  licenseKey: string | null
  deviceId: string
  /** صحيح حين تعذّر الوصول للخادم وسُمح بالمتابعة مؤقتًا. */
  degraded: boolean
}

export type LicenseInputs = {
  deviceId: string
  licenseKey: string | null
  clientName: string | null
  phone: string | null
  activatedAt: string | null
  lastState: string | null
  lastVerifiedAt: string | null
}

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0'

/**
 * سبب فشل النداء. التمييز مقصود: انقطاع الشبكة عارض ولا يصحّ أن يعطّل
 * المكتب، أما نقص الإعدادات فخطأ نشر — لو فتحنا النظام عنده لصار تعطيل
 * البوابة بحذف متغيّر بيئة.
 */
export type VerifyFailure = 'config' | 'network'

/** نداء واحد إلى verify_license عبر REST — من الخادم فقط. */
export async function callVerifyLicense(params: {
  deviceId: string
  licenseKey?: string | null
  phone?: string | null
  clientName?: string | null
}): Promise<{ ok: true; data: VerifyResponse } | { ok: false; error: string; kind: VerifyFailure }> {
  const key = process.env.LICENSE_API_KEY
  const url = process.env.LICENSE_API_URL?.replace(/\/+$/, '')

  if (!key || !url) {
    return {
      ok: false, kind: 'config',
      error: 'إعدادات الاتصال بخادم التراخيص ناقصة على هذا الخادم.',
    }
  }

  try {
    const response = await fetch(`${url}/rest/v1/rpc/verify_license`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        p_program: LICENSE_PROGRAM,
        p_device_id: params.deviceId,
        p_license_key: params.licenseKey ?? null,
        p_app_version: APP_VERSION,
        p_phone: params.phone ?? null,
        p_client_name: params.clientName ?? null,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      return {
        ok: false, kind: 'network',
        error: `خادم التراخيص ردّ بالحالة ${response.status}.`,
      }
    }

    return { ok: true, data: (await response.json()) as VerifyResponse }
  } catch {
    return { ok: false, kind: 'network', error: 'تعذّر الوصول لخادم التراخيص.' }
  }
}

/** مدخلات الترخيص المحفوظة محليًا. مغلّفة بـ cache ⇒ قراءة واحدة لكل طلب. */
export const getLicenseInputs = cache(async (): Promise<LicenseInputs | null> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('license_state')
    .select('device_id, license_key, client_name, phone, activated_at, last_state, last_verified_at')
    .maybeSingle()

  if (!data) return null

  return {
    deviceId: data.device_id,
    licenseKey: data.license_key,
    clientName: data.client_name,
    phone: data.phone,
    activatedAt: data.activated_at,
    lastState: data.last_state,
    lastVerifiedAt: data.last_verified_at,
  }
})

/**
 * حالة الترخيص الحالية. تُحسب بسؤال خادم التراخيص في كل طلب
 * (مغلّفة بـ cache ⇒ نداء واحد لكل طلب مهما تكرّر الاستدعاء).
 *
 * القرار لا يُقرأ من قاعدة بياناتنا إطلاقًا، فلا يمكن تزويره بالكتابة
 * في جدول. ما يُحفظ محليًا هو المفتاح ومعرّف النسخة فقط.
 *
 * عند تعذّر الوصول للخادم نسمح بالمتابعة مع تنبيه ظاهر: تعطيل مكتب
 * محاماة كامل بسبب انقطاع شبكة عن خادم التراخيص ضرر أكبر من نفعه.
 * أما الرفض الصريح (منتهٍ، مفتاح خاطئ) فيمنع فورًا.
 */
export const getLicenseStatus = cache(async (): Promise<LicenseStatus> => {
  const inputs = await getLicenseInputs()

  if (!inputs) {
    return {
      allowed: false, state: 'not_activated', message: 'لم يُفعَّل النظام بعد.',
      licenseType: null, expiresAt: null, daysRemaining: null, isLifetime: false,
      licenseKey: null, deviceId: '', degraded: false,
    }
  }

  const base = {
    licenseType: null as string | null,
    expiresAt: null as string | null,
    daysRemaining: null as number | null,
    isLifetime: false,
    licenseKey: inputs.licenseKey,
    deviceId: inputs.deviceId,
  }

  // بلا مفتاح وبلا طلب تجريبي سابق ⇒ لم يبدأ التفعيل أصلًا، فلا داعي لنداء الخادم.
  // أما إن وُجد أحدهما فننادي الخادم: طلب التجربة يُتحقَّق منه بربط الجهاز لا بمفتاح.
  if (!inputs.licenseKey && !inputs.phone) {
    return {
      ...base, allowed: false, state: 'not_activated',
      message: 'لم يُفعَّل النظام بعد. أدخل مفتاح الترخيص أو اطلب نسخة تجريبية.',
      degraded: false,
    }
  }

  const result = await callVerifyLicense({
    deviceId: inputs.deviceId,
    licenseKey: inputs.licenseKey,
    phone: inputs.phone,
    clientName: inputs.clientName,
  })

  if (!result.ok) {
    // نقص الإعدادات خطأ نشر يُغلق النظام: فتحه عنده يجعل تعطيل البوابة
    // ممكنًا بحذف متغيّر بيئة. أما انقطاع الشبكة فيُبقيه عاملًا مع تنبيه.
    if (result.kind === 'config') {
      return { ...base, allowed: false, state: 'misconfigured', message: result.error, degraded: false }
    }
    return { ...base, allowed: true, state: 'unreachable', message: result.error, degraded: true }
  }

  const data = result.data
  const state = data.state ?? 'unknown'

  return {
    allowed: data.ok === true && (VALID_STATES as readonly string[]).includes(state),
    state,
    message: data.message ?? null,
    licenseType: data.licenseType ?? null,
    expiresAt: data.expiresAt ?? null,
    daysRemaining: data.daysRemaining ?? null,
    isLifetime: data.isLifetime === true,
    licenseKey: data.licenseKey ?? inputs.licenseKey,
    deviceId: inputs.deviceId,
    degraded: false,
  }
})
