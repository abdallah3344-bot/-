/**
 * نموذج الصلاحيات — النسخة المشتركة بين الخادم والعميل.
 * مصدر الحقيقة هو قاعدة البيانات (جدول permissions)؛ هذه الثوابت
 * موجودة لضمان سلامة الأنواع فقط، وأي تعارض يظهر فورًا في البناء.
 */

export const MODULES = [
  'dashboard', 'clients', 'cases', 'hearings', 'calendar', 'tasks',
  'documents', 'poa', 'contracts', 'fees', 'invoices', 'payments',
  'expenses', 'accounts', 'correspondence', 'staff', 'reports',
  'archive', 'notifications', 'settings', 'users', 'audit',
] as const

export const ACTIONS = [
  'view', 'create', 'update', 'delete',
  'print', 'export', 'download', 'approve',
] as const

export type Module = (typeof MODULES)[number]
export type Action = (typeof ACTIONS)[number]
export type PermissionCode = `${Module}.${Action}`

export const MODULE_LABELS: Record<Module, string> = {
  dashboard: 'لوحة التحكم',
  clients: 'العملاء',
  cases: 'القضايا',
  hearings: 'الجلسات',
  calendar: 'التقويم',
  tasks: 'المهام',
  documents: 'المستندات',
  poa: 'الوكالات',
  contracts: 'العقود',
  fees: 'أتعاب المحاماة',
  invoices: 'الفواتير',
  payments: 'المقبوضات',
  expenses: 'المصروفات',
  accounts: 'الحسابات',
  correspondence: 'المراسلات',
  staff: 'المحامون والموظفون',
  reports: 'التقارير',
  archive: 'الأرشيف',
  notifications: 'التنبيهات',
  settings: 'الإعدادات',
  users: 'المستخدمون والصلاحيات',
  audit: 'سجل العمليات',
}

export const ACTION_LABELS: Record<Action, string> = {
  view: 'عرض',
  create: 'إضافة',
  update: 'تعديل',
  delete: 'حذف',
  print: 'طباعة',
  export: 'تصدير',
  download: 'تحميل',
  approve: 'اعتماد',
}

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'مدير النظام',
  office_manager: 'مدير المكتب',
  lawyer: 'محامي',
  secretary: 'سكرتير',
  accountant: 'محاسب',
  custom: 'مستخدم مخصص',
}

/** مجموعة صلاحيات المستخدم الحالي مع أدوات فحص مريحة. */
export class PermissionSet {
  private readonly codes: ReadonlySet<string>

  constructor(codes: Iterable<string>) {
    this.codes = new Set(codes)
  }

  /** هل يملك المستخدم هذه الصلاحية؟ */
  can(module: Module, action: Action): boolean {
    return this.codes.has(`${module}.${action}`)
  }

  /** هل يملك أي صلاحية على هذه الوحدة؟ (لإظهار عنصر القائمة) */
  canAccessModule(module: Module): boolean {
    for (const code of this.codes) {
      if (code.startsWith(`${module}.`)) return true
    }
    return false
  }

  get size() {
    return this.codes.size
  }

  toArray(): string[] {
    return [...this.codes]
  }
}
