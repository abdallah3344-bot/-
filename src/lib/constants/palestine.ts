/**
 * ثوابت السياق الفلسطيني.
 *
 * النظام موجَّه لمكاتب المحاماة في فلسطين، فالمحافظات ودرجات التقاضي
 * وأنواع المحاكم تتبع قانون تشكيل المحاكم النظامية.
 *
 * القوائم هنا نقطة بداية معقولة، وكل ما يُبنى عليها قابل للتعديل من
 * «الإعدادات ← جداول المراجع» — فالمكتب هو من يضبطها على واقع عمله.
 */

export const WEST_BANK_GOVERNORATES = [
  'القدس',
  'رام الله والبيرة',
  'نابلس',
  'الخليل',
  'بيت لحم',
  'جنين',
  'طولكرم',
  'قلقيلية',
  'سلفيت',
  'طوباس',
  'أريحا والأغوار',
] as const

export const GAZA_GOVERNORATES = [
  'غزة',
  'شمال غزة',
  'دير البلح',
  'خان يونس',
  'رفح',
] as const

export const GOVERNORATES = [...WEST_BANK_GOVERNORATES, ...GAZA_GOVERNORATES] as const
export type Governorate = (typeof GOVERNORATES)[number]

/** مجموعات القائمة المنسدلة — تُسهّل الاختيار على قائمة من ستّ عشرة محافظة. */
export const GOVERNORATE_GROUPS: { label: string; items: readonly string[] }[] = [
  { label: 'الضفة الغربية', items: WEST_BANK_GOVERNORATES },
  { label: 'قطاع غزة', items: GAZA_GOVERNORATES },
]

/** أنواع المحاكم في النظام القضائي الفلسطيني. */
export const COURT_TYPES = [
  'magistrate', 'first_instance', 'appeal', 'cassation', 'high_justice',
  'constitutional', 'sharia', 'ecclesiastical', 'felonies', 'municipal', 'tax', 'other',
] as const
export type CourtType = (typeof COURT_TYPES)[number]

export const COURT_TYPE_LABELS: Record<CourtType, string> = {
  magistrate: 'صلح',
  first_instance: 'بداية',
  appeal: 'استئناف',
  cassation: 'نقض',
  high_justice: 'عدل عليا',
  constitutional: 'دستورية',
  sharia: 'شرعية',
  ecclesiastical: 'كنسية',
  felonies: 'جنايات كبرى',
  municipal: 'بلديات',
  tax: 'ضريبية',
  other: 'أخرى',
}

/**
 * نسبة ضريبة القيمة المضافة في فلسطين.
 * قيمة ابتدائية فقط — تُضبط من الإعدادات وتتغيّر بقرار رسمي.
 */
export const DEFAULT_VAT_RATE = 16
