/** القيم المسموحة في قاعدة البيانات مع تسمياتها العربية وألوانها. */

type Tone = 'default' | 'gold' | 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'outline'

// ---------------- القضايا ----------------
export const CASE_STATUSES = [
  'new', 'in_progress', 'awaiting_hearing', 'awaiting_decision',
  'appeal', 'cassation', 'execution', 'settlement', 'closed', 'archived',
] as const
export type CaseStatus = (typeof CASE_STATUSES)[number]

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  new: 'جديدة',
  in_progress: 'قيد المتابعة',
  awaiting_hearing: 'بانتظار جلسة',
  awaiting_decision: 'بانتظار قرار',
  appeal: 'استئناف',
  cassation: 'نقض',
  execution: 'تنفيذ',
  settlement: 'تسوية',
  closed: 'مغلقة',
  archived: 'مؤرشفة',
}

export const CASE_STATUS_TONE: Record<CaseStatus, Tone> = {
  new: 'info',
  in_progress: 'gold',
  awaiting_hearing: 'warning',
  awaiting_decision: 'warning',
  appeal: 'info',
  cassation: 'info',
  execution: 'default',
  settlement: 'success',
  closed: 'muted',
  archived: 'muted',
}

export const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
export type Priority = (typeof PRIORITIES)[number]

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'منخفضة', medium: 'متوسطة', high: 'عالية', urgent: 'عاجلة',
}
export const PRIORITY_TONE: Record<Priority, Tone> = {
  low: 'muted', medium: 'info', high: 'warning', urgent: 'danger',
}

export const LITIGATION_DEGREES = ['first_instance', 'appeal', 'cassation', 'execution'] as const
export type LitigationDegree = (typeof LITIGATION_DEGREES)[number]
export const LITIGATION_DEGREE_LABELS: Record<LitigationDegree, string> = {
  first_instance: 'درجة أولى', appeal: 'استئناف', cassation: 'نقض', execution: 'تنفيذ',
}

// ---------------- العملاء ----------------
export const CLIENT_TYPES = ['individual', 'company', 'institution', 'legal_entity'] as const
export type ClientType = (typeof CLIENT_TYPES)[number]
export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  individual: 'فرد', company: 'شركة', institution: 'مؤسسة', legal_entity: 'جهة اعتبارية',
}

export const CLIENT_STATUSES = ['active', 'inactive', 'blocked'] as const
export type ClientStatus = (typeof CLIENT_STATUSES)[number]
export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  active: 'نشط', inactive: 'غير نشط', blocked: 'موقوف',
}
export const CLIENT_STATUS_TONE: Record<ClientStatus, Tone> = {
  active: 'success', inactive: 'muted', blocked: 'danger',
}

// ---------------- الجلسات ----------------
export const HEARING_TYPES = [
  'session', 'pleading', 'evidence', 'expert', 'judgment', 'postponement', 'execution', 'other',
] as const
export type HearingType = (typeof HEARING_TYPES)[number]
export const HEARING_TYPE_LABELS: Record<HearingType, string> = {
  session: 'جلسة عادية', pleading: 'مرافعة', evidence: 'بيّنات', expert: 'خبرة',
  judgment: 'نطق بالحكم', postponement: 'تأجيل', execution: 'تنفيذ', other: 'أخرى',
}

export const HEARING_STATUSES = ['scheduled', 'held', 'postponed', 'cancelled'] as const
export type HearingStatus = (typeof HEARING_STATUSES)[number]
export const HEARING_STATUS_LABELS: Record<HearingStatus, string> = {
  scheduled: 'مجدولة', held: 'انعقدت', postponed: 'مؤجلة', cancelled: 'ملغاة',
}
export const HEARING_STATUS_TONE: Record<HearingStatus, Tone> = {
  scheduled: 'info', held: 'success', postponed: 'warning', cancelled: 'muted',
}

// ---------------- المهام ----------------
export const TASK_STATUSES = ['new', 'in_progress', 'completed', 'late', 'cancelled'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  new: 'جديدة', in_progress: 'قيد التنفيذ', completed: 'مكتملة',
  late: 'متأخرة', cancelled: 'ملغاة',
}
export const TASK_STATUS_TONE: Record<TaskStatus, Tone> = {
  new: 'info', in_progress: 'gold', completed: 'success', late: 'danger', cancelled: 'muted',
}

// ---------------- المالية ----------------
export const PAYMENT_METHODS = ['cash', 'cheque', 'bank_transfer', 'card', 'other'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'نقدي', cheque: 'شيك', bank_transfer: 'تحويل بنكي', card: 'بطاقة', other: 'أخرى',
}

export const INVOICE_STATUSES = ['draft', 'issued', 'partial', 'paid', 'overdue', 'cancelled'] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'مسودة', issued: 'صادرة', partial: 'مدفوعة جزئيًا',
  paid: 'مدفوعة', overdue: 'متأخرة', cancelled: 'ملغاة',
}
export const INVOICE_STATUS_TONE: Record<InvoiceStatus, Tone> = {
  draft: 'muted', issued: 'info', partial: 'warning',
  paid: 'success', overdue: 'danger', cancelled: 'muted',
}

// ---------------- الوكالات والعقود ----------------
export const POA_TYPES = ['general', 'specific', 'litigation', 'execution', 'other'] as const
export type PoaType = (typeof POA_TYPES)[number]
export const POA_TYPE_LABELS: Record<PoaType, string> = {
  general: 'عامة', specific: 'خاصة', litigation: 'مخاصمة', execution: 'تنفيذ', other: 'أخرى',
}

export const POA_STATUSES = ['active', 'expired', 'revoked'] as const
export type PoaStatus = (typeof POA_STATUSES)[number]
export const POA_STATUS_LABELS: Record<PoaStatus, string> = {
  active: 'سارية', expired: 'منتهية', revoked: 'ملغاة',
}
export const POA_STATUS_TONE: Record<PoaStatus, Tone> = {
  active: 'success', expired: 'warning', revoked: 'danger',
}

export const CONTRACT_STATUSES = ['draft', 'active', 'expired', 'terminated', 'completed'] as const
export type ContractStatus = (typeof CONTRACT_STATUSES)[number]
export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: 'مسودة', active: 'ساري', expired: 'منتهٍ', terminated: 'مفسوخ', completed: 'منفَّذ',
}
export const CONTRACT_STATUS_TONE: Record<ContractStatus, Tone> = {
  draft: 'muted', active: 'success', expired: 'warning',
  terminated: 'danger', completed: 'info',
}

// ---------------- المراسلات ----------------
export const CORR_DIRECTIONS = ['outgoing', 'incoming'] as const
export type CorrDirection = (typeof CORR_DIRECTIONS)[number]
export const CORR_DIRECTION_LABELS: Record<CorrDirection, string> = {
  outgoing: 'صادر', incoming: 'وارد',
}

export const CORR_PARTY_TYPES = ['client', 'court', 'official', 'other'] as const
export type CorrPartyType = (typeof CORR_PARTY_TYPES)[number]
export const CORR_PARTY_LABELS: Record<CorrPartyType, string> = {
  client: 'عميل', court: 'محكمة', official: 'جهة رسمية', other: 'أخرى',
}

export const CORR_STATUSES = ['open', 'in_progress', 'closed'] as const
export type CorrStatus = (typeof CORR_STATUSES)[number]
export const CORR_STATUS_LABELS: Record<CorrStatus, string> = {
  open: 'مفتوحة', in_progress: 'قيد المعالجة', closed: 'مغلقة',
}

/** يقرأ تسمية من خريطة بأمان مع قيمة احتياطية. */
export function labelOf<T extends string>(
  map: Record<T, string>,
  key: string | null | undefined,
  fallback = '—',
): string {
  if (!key) return fallback
  return (map as Record<string, string>)[key] ?? key
}

export function toneOf<T extends string>(
  map: Record<T, Tone>,
  key: string | null | undefined,
  fallback: Tone = 'muted',
): Tone {
  if (!key) return fallback
  return (map as Record<string, Tone>)[key] ?? fallback
}
