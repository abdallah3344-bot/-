import 'server-only'

/**
 * ربط رابط المكتب <slug>.masryps.com بالـ Worker تلقائيًا عبر Cloudflare API
 * (Workers Custom Domains). Cloudflare ينشئ سجل DNS والشهادة وحده،
 * ويجهز الرابط عادةً خلال دقيقة أو دقيقتين.
 *
 * يحتاج متغيرات الـ Worker:
 *   CF_API_TOKEN   (سرّ) مفتاح بصلاحية Workers على الحساب والنطاق
 *   CF_ACCOUNT_ID  معرّف حساب Cloudflare
 *   CF_ZONE_ID     معرّف نطاق masryps.com
 *   CF_WORKER_NAME اسم الـ Worker (masri-law-office، أو نسخة الاختبار)
 * بدونها لا يحدث شيء ويبقى الرابط «بانتظار الربط».
 */
export const ROOT_DOMAIN = 'masryps.com'

type CfConfig = { token: string; account: string; zone: string; worker: string }

function config(): CfConfig | null {
  const token = process.env.CF_API_TOKEN
  const account = process.env.CF_ACCOUNT_ID
  const zone = process.env.CF_ZONE_ID
  if (!token || !account || !zone) return null
  return { token, account, zone, worker: process.env.CF_WORKER_NAME || 'masri-law-office' }
}

export function domainsConfigured(): boolean {
  return config() !== null
}

export function officeHost(slug: string): string {
  return `${slug}.${ROOT_DOMAIN}`
}

type CfResponse<T> = { success: boolean; result: T; errors?: { code: number; message: string }[] }

async function cf<T>(cfg: CfConfig, path: string, init?: RequestInit): Promise<CfResponse<T>> {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfg.account}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15_000),
  })
  return (await res.json().catch(() => ({ success: false, result: null, errors: [{ code: res.status, message: res.statusText }] }))) as CfResponse<T>
}

function explain(errors: CfResponse<unknown>['errors']): string {
  const msg = errors?.map((e) => e.message).join('؛ ') || 'خطأ غير معروف'
  if (/already has externally managed DNS records|already exists|conflict/i.test(msg)) {
    return 'هذا الرابط مستعمل لموقع آخر على النطاق.'
  }
  if (/authentication|unauthorized|permission/i.test(msg)) return 'مفتاح Cloudflare لا يملك الصلاحية اللازمة.'
  return msg
}

export type AttachResult = { ok: true } | { ok: false; error: string; notConfigured?: boolean }

/** يربط الرابط بالـ Worker. آمن للتكرار: إن كان مربوطًا به مسبقًا ينجح. */
export async function attachOfficeDomain(slug: string): Promise<AttachResult> {
  const cfg = config()
  if (!cfg) return { ok: false, error: 'الربط التلقائي غير مفعّل بعد (مفتاح Cloudflare غير مضاف).', notConfigured: true }
  try {
    const r = await cf<unknown>(cfg, '/workers/domains', {
      method: 'PUT',
      body: JSON.stringify({
        hostname: officeHost(slug),
        service: cfg.worker,
        zone_id: cfg.zone,
        environment: 'production',
      }),
    })
    return r.success ? { ok: true } : { ok: false, error: explain(r.errors) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'تعذّر الاتصال بـ Cloudflare' }
  }
}

/** يفك ربط رابط قديم بعد تغييره — فقط إن كان مربوطًا بهذا الـ Worker. */
export async function detachOfficeDomain(slug: string): Promise<void> {
  const cfg = config()
  if (!cfg) return
  try {
    const list = await cf<{ id: string; hostname: string; service: string }[]>(
      cfg, `/workers/domains?hostname=${encodeURIComponent(officeHost(slug))}`)
    for (const d of list.result ?? []) {
      if (d.hostname === officeHost(slug) && d.service === cfg.worker) {
        await cf(cfg, `/workers/domains/${d.id}`, { method: 'DELETE' })
      }
    }
  } catch {
    // فك الربط تنظيف فقط؛ فشله لا يعطّل شيئًا
  }
}
