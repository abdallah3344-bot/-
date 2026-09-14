import 'server-only'

import { buildCaseContext } from './context'

/**
 * ورقة بيانات القضية للإدخال في نظام ميزان.
 *
 * **ليست تكاملًا رسميًا.** نظام ميزان التابع لمجلس القضاء الأعلى نظام
 * مغلق ولا صيغة استيراد منشورة له، فلا يصحّ الادّعاء بالتوافق. ما
 * تفعله هذه الوحدة: ترتيب بيانات القضية في ورقة واحدة بالترتيب الذي
 * تُدخَل به عادة، لتُنسخ منها بدل التنقّل بين شاشات النظام.
 */

export type SheetRow = { label: string; value: string }
export type SheetSection = { title: string; rows: SheetRow[] }

const DASH = '—'

export async function buildMizanSheet(caseId: string): Promise<SheetSection[]> {
  const c = await buildCaseContext(caseId)
  const v = (key: string) => (c[key] ?? '') || DASH

  return [
    {
      title: 'بيانات القضية',
      rows: [
        { label: 'المحكمة', value: v('case.court') },
        { label: 'المحافظة', value: v('case.governorate') },
        { label: 'نوع القضية', value: v('case.type') },
        { label: 'درجة التقاضي', value: v('case.degree') },
        { label: 'رقم القضية في المحكمة', value: v('case.court_case_no') },
        { label: 'رقم الملف الداخلي', value: v('case.internal_no') },
        { label: 'موضوع الدعوى', value: v('case.title') },
        { label: 'قيمة الدعوى', value: v('case.claim_amount') },
        { label: 'تاريخ نشوء الادعاء', value: v('case.claim_arose_at') },
        { label: 'تاريخ التسجيل', value: v('case.registered_at') },
      ],
    },
    {
      title: 'المدعي',
      rows: [
        { label: 'الاسم', value: v('client.name') },
        { label: 'رقم الهوية', value: v('client.national_id') },
        { label: 'الصفة / المهنة', value: v('client.occupation') },
        { label: 'محل العمل', value: v('client.workplace') },
        { label: 'محل الإقامة', value: v('client.address') },
        { label: 'الهاتف', value: v('client.phone') },
        { label: 'الأهلية', value: v('client.legal_capacity') },
      ],
    },
    {
      title: 'المدعى عليه',
      rows: [
        { label: 'الاسم', value: v('opponent.name') },
        { label: 'رقم الهوية', value: v('opponent.national_id') },
        { label: 'الصفة / المهنة', value: v('opponent.occupation') },
        { label: 'محل العمل', value: v('opponent.workplace') },
        { label: 'العنوان', value: v('opponent.address') },
        { label: 'الأهلية', value: v('opponent.legal_capacity') },
        { label: 'كل الخصوم', value: v('opponents.all') },
      ],
    },
    {
      title: 'الوقائع والطلبات',
      rows: [
        { label: 'الوقائع وأسباب الادعاء', value: v('case.description') },
        { label: 'الطلبات', value: v('case.claim_requests') },
        { label: 'وصف العقار أو المنقول', value: v('case.property_description') },
      ],
    },
    {
      title: 'المكتب',
      rows: [
        { label: 'المحامي المسؤول', value: v('case.lawyer') },
        { label: 'اسم المكتب', value: v('office.name') },
        { label: 'هاتف المكتب', value: v('office.phone') },
      ],
    },
  ]
}

/** نفس البيانات كـ JSON مسطّح — لمن يريد نقلها آليًا. */
export async function buildMizanJson(caseId: string): Promise<Record<string, string>> {
  const sections = await buildMizanSheet(caseId)
  const out: Record<string, string> = {}
  for (const section of sections) {
    for (const row of section.rows) {
      out[`${section.title} — ${row.label}`] = row.value === DASH ? '' : row.value
    }
  }
  return out
}
