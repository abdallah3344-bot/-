/**
 * كتالوج حقول الدمج.
 *
 * القالب ملك المكتب والنظام يملؤه فقط: لا يؤلّف نصًّا قانونيًا ولا
 * يستنتج شيئًا. كل حقل هنا قيمة تُقرأ من القاعدة كما هي.
 */

export type MergeField = {
  key: string
  label: string
  group: string
}

export const MERGE_FIELDS: MergeField[] = [
  // المكتب
  { key: 'office.name',        label: 'اسم المكتب',              group: 'المكتب' },
  { key: 'office.address',     label: 'عنوان المكتب',            group: 'المكتب' },
  { key: 'office.phone',       label: 'هاتف المكتب',             group: 'المكتب' },
  { key: 'office.email',       label: 'بريد المكتب',             group: 'المكتب' },
  { key: 'office.tax_number',  label: 'الرقم الضريبي',           group: 'المكتب' },

  // القضية
  { key: 'case.internal_no',   label: 'رقم الملف الداخلي',       group: 'القضية' },
  { key: 'case.court_case_no', label: 'رقم القضية في المحكمة',   group: 'القضية' },
  { key: 'case.title',         label: 'موضوع القضية',            group: 'القضية' },
  { key: 'case.type',          label: 'نوع القضية',              group: 'القضية' },
  { key: 'case.court',         label: 'المحكمة',                 group: 'القضية' },
  { key: 'case.governorate',   label: 'المحافظة',                group: 'القضية' },
  { key: 'case.degree',        label: 'درجة التقاضي',            group: 'القضية' },
  { key: 'case.status',        label: 'حالة القضية',             group: 'القضية' },
  { key: 'case.registered_at', label: 'تاريخ التسجيل',           group: 'القضية' },
  { key: 'case.claim_amount',  label: 'قيمة الدعوى',             group: 'القضية' },
  { key: 'case.claim_arose_at', label: 'تاريخ نشوء الادعاء',     group: 'القضية' },
  { key: 'case.description',   label: 'الوقائع وأسباب الادعاء',  group: 'القضية' },
  { key: 'case.claim_requests', label: 'الطلبات',                group: 'القضية' },
  { key: 'case.property_description', label: 'وصف العقار أو المنقول', group: 'القضية' },
  { key: 'case.lawyer',        label: 'المحامي المسؤول',         group: 'القضية' },
  { key: 'case.first_hearing_at', label: 'أول جلسة',             group: 'القضية' },

  // الموكل
  { key: 'client.name',        label: 'اسم الموكل',              group: 'الموكل' },
  { key: 'client.type',        label: 'صفة الموكل',              group: 'الموكل' },
  { key: 'client.national_id', label: 'رقم هوية الموكل',         group: 'الموكل' },
  { key: 'client.occupation',  label: 'مهنة الموكل',             group: 'الموكل' },
  { key: 'client.workplace',   label: 'محل عمل الموكل',          group: 'الموكل' },
  { key: 'client.address',     label: 'محل إقامة الموكل',        group: 'الموكل' },
  { key: 'client.phone',       label: 'هاتف الموكل',             group: 'الموكل' },
  { key: 'client.email',       label: 'بريد الموكل',             group: 'الموكل' },
  { key: 'client.legal_capacity', label: 'أهلية الموكل',         group: 'الموكل' },

  // الخصم الأول
  { key: 'opponent.name',           label: 'اسم الخصم',          group: 'الخصم' },
  { key: 'opponent.national_id',    label: 'رقم هوية الخصم',     group: 'الخصم' },
  { key: 'opponent.occupation',     label: 'مهنة الخصم',         group: 'الخصم' },
  { key: 'opponent.workplace',      label: 'محل عمل الخصم',      group: 'الخصم' },
  { key: 'opponent.address',        label: 'عنوان الخصم',        group: 'الخصم' },
  { key: 'opponent.lawyer_name',    label: 'محامي الخصم',        group: 'الخصم' },
  { key: 'opponent.legal_capacity', label: 'أهلية الخصم',        group: 'الخصم' },
  { key: 'opponents.all',           label: 'كل الخصوم (أسماء)',  group: 'الخصم' },

  // عام
  { key: 'today',              label: 'تاريخ اليوم',             group: 'عام' },
  { key: 'today.hijri',        label: 'تاريخ اليوم هجريًا',      group: 'عام' },
  { key: 'user.name',          label: 'اسم المستخدم الحالي',     group: 'عام' },
]

export const MERGE_FIELD_GROUPS = [...new Set(MERGE_FIELDS.map((f) => f.group))]

/** الحقول التي لا قيمة لها خارج سياق القضية. */
export const CASE_ONLY_PREFIXES = ['case.', 'opponent.', 'opponents.']
