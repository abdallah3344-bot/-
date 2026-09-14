/** ثوابت الربط مع لوحة تراخيص المصري جروب — يستوردها الخادم والمتصفح. */

/** معرّف هذا البرنامج في اللوحة. يطابق programs.slug هناك. */
export const LICENSE_PROGRAM = 'law-office'

/** حالات يرجعها خادم التراخيص وتعني أن النظام مُرخَّص ويعمل. */
export const VALID_STATES = ['licensed_valid', 'trial_active'] as const

/** تسمية عربية لكل نوع ترخيص. */
export const LICENSE_TYPE_LABELS: Record<string, string> = {
  trial: 'نسخة تجريبية',
  annual: 'اشتراك سنوي',
  monthly: 'اشتراك شهري',
  lifetime: 'ترخيص دائم',
  permanent: 'ترخيص دائم',
}

/** تسمية عربية لحالات خادم التراخيص. */
export const LICENSE_STATE_LABELS: Record<string, string> = {
  licensed_valid: 'ترخيص سارٍ',
  trial_active: 'نسخة تجريبية سارية',
  trial_pending: 'طلب تجريبي قيد المراجعة',
  trial_expired: 'انتهت الفترة التجريبية',
  trial_rejected: 'رُفض الطلب التجريبي',
  expired: 'انتهت صلاحية الترخيص',
  invalid_key: 'مفتاح ترخيص غير صحيح',
  device_pending: 'الجهاز بانتظار الموافقة',
  device_rejected: 'رُفض تفعيل الجهاز',
  device_mismatch: 'تجاوز الحد الأقصى للأجهزة',
  phone_required: 'مطلوب رقم الجوال',
  phone_mismatch: 'رقم الجوال لا يطابق المسجَّل',
  key_required: 'مطلوب مفتاح الترخيص',
  name_required: 'مطلوب اسم المكتب',
  unreachable: 'تعذّر الوصول لخادم التراخيص',
  misconfigured: 'إعدادات الترخيص ناقصة على الخادم',
  not_activated: 'النظام غير مفعَّل',
}
