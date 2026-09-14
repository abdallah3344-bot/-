import 'server-only'

import { createClient } from '@/lib/supabase/server'

/**
 * فحص اكتمال بيانات لائحة الدعوى.
 *
 * المرجع: قانون أصول المحاكمات المدنية والتجارية رقم (2) لسنة 2001،
 * المادة 52 — ويُراجَع النص النافذ بعد تعديلات 2024.
 *
 * حدّ مقصود: هذا فحص **اكتمال بيانات** لا مراجعة قانونية. النظام
 * يقول «هذا الحقل فارغ»، ولا يقول إن اللائحة صحيحة أو مقبولة. صياغة
 * اللائحة وصحّتها مسؤولية المحامي وحده.
 */

export type CheckState = 'ok' | 'missing' | 'not_applicable'

export type ClaimCheckItem = {
  key: string
  /** نصّ البند كما يوجبه القانون */
  label: string
  state: CheckState
  /** القيمة الموجودة، أو ما ينقص وأين يُستكمل */
  detail: string
  /** أين يُستكمل الناقص */
  fixHref?: string
}

export type ClaimCheck = {
  items: ClaimCheckItem[]
  okCount: number
  missingCount: number
  /** البنود المنطبقة كلها مكتملة */
  complete: boolean
}

function value(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v).trim()
  return s
}

export async function checkClaimData(caseId: string): Promise<ClaimCheck | null> {
  const supabase = await createClient()

  const [{ data: row }, { data: opponents }] = await Promise.all([
    supabase.from('cases').select(`
      id, title, governorate, claim_amount, description, claim_requests,
      claim_arose_at, property_description, client_id,
      clients:client_id(name, client_type, national_id, occupation, workplace, address, legal_capacity),
      courts:court_id(name_ar)
    `).eq('id', caseId).is('deleted_at', null).maybeSingle(),
    supabase.from('opponents')
      .select('name, occupation, workplace, address, legal_capacity')
      .eq('case_id', caseId),
  ])

  if (!row) return null

  const c = row as unknown as Record<string, unknown>
  const client = (c.clients ?? null) as Record<string, unknown> | null
  const court = (c.courts ?? null) as Record<string, unknown> | null
  const parties = opponents ?? []

  const caseHref = `/cases/${caseId}/edit`
  const clientHref = c.client_id ? `/clients/${String(c.client_id)}/edit` : undefined
  const opponentsHref = `/cases/${caseId}?tab=opponents`

  const items: ClaimCheckItem[] = []

  const add = (
    key: string, label: string, present: string,
    fixHref?: string, hint = 'غير مُدخَل',
  ) => {
    items.push({
      key, label,
      state: present ? 'ok' : 'missing',
      detail: present || hint,
      fixHref: present ? undefined : fixHref,
    })
  }

  // 1) اسم المحكمة
  add('court', 'اسم المحكمة المرفوعة أمامها الدعوى',
      value(court?.name_ar), caseHref, 'لم تُحدَّد محكمة للقضية')

  // 2) بيانات المدعي
  add('client_name', 'اسم المدعي', value(client?.name), clientHref)
  add('client_occupation', 'صفة المدعي ومهنته', value(client?.occupation), clientHref)
  add('client_workplace', 'محل عمل المدعي', value(client?.workplace), clientHref)
  add('client_address', 'محل إقامة المدعي', value(client?.address), clientHref)

  // 3) بيانات المدعى عليه
  if (parties.length === 0) {
    items.push({
      key: 'opponents', label: 'اسم المدعى عليه وصفته وعنوانه',
      state: 'missing', detail: 'لم يُسجَّل أي خصم على القضية', fixHref: opponentsHref,
    })
  } else {
    const incomplete = parties.filter((p) => {
      const o = p as Record<string, unknown>
      return !value(o.name) || !value(o.address)
    })
    items.push({
      key: 'opponents',
      label: 'اسم المدعى عليه وصفته وعنوانه',
      state: incomplete.length === 0 ? 'ok' : 'missing',
      detail: incomplete.length === 0
        ? `${parties.length} خصم — الاسم والعنوان مُدخَلان`
        : `${incomplete.length} من ${parties.length} خصم بلا اسم أو عنوان`,
      fixHref: incomplete.length === 0 ? undefined : opponentsHref,
    })
  }

  // 4) الأهلية — بند شرطي: لا يُطلب إلا عند النقص
  const capacityNotes = [
    value(client?.legal_capacity),
    ...parties.map((p) => value((p as Record<string, unknown>).legal_capacity)),
  ].filter(Boolean)
  items.push({
    key: 'capacity',
    label: 'بيان نقص الأهلية أو انعدامها ومن يمثّل ناقص الأهلية',
    state: capacityNotes.length > 0 ? 'ok' : 'not_applicable',
    detail: capacityNotes.length > 0
      ? capacityNotes.join(' · ')
      : 'لم يُسجَّل نقص أهلية لأي طرف — البند غير منطبق',
  })

  // 5) موضوع الدعوى
  add('subject', 'موضوع الدعوى', value(c.title), caseHref)

  // 6) قيمة الدعوى
  add('amount', 'قيمة الدعوى أو تقديرها',
      c.claim_amount === null || c.claim_amount === undefined ? '' : String(c.claim_amount),
      caseHref, 'لم تُحدَّد قيمة ولا تقدير')

  // 7) الوقائع والأسباب وتاريخ النشوء والطلبات
  add('facts', 'وقائع الدعوى وأسباب الادعاء', value(c.description), caseHref)
  add('arose', 'تاريخ نشوء الادعاء',
      c.claim_arose_at ? String(c.claim_arose_at) : '', caseHref)
  add('requests', 'طلبات المدعي', value(c.claim_requests), caseHref)

  // 8) وصف العين — بند شرطي
  const property = value(c.property_description)
  items.push({
    key: 'property',
    label: 'وصف العقار أو المنقول إن كان موضوع الدعوى عينًا معيّنة',
    state: property ? 'ok' : 'not_applicable',
    detail: property || 'لم يُدخَل وصف — البند غير منطبق إن لم تكن الدعوى على عين معيّنة',
    fixHref: property ? undefined : caseHref,
  })

  const okCount = items.filter((i) => i.state === 'ok').length
  const missingCount = items.filter((i) => i.state === 'missing').length

  return { items, okCount, missingCount, complete: missingCount === 0 }
}
