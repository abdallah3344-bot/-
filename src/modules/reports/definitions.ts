/**
 * سجلّ التقارير.
 * كل تقرير يُعرَّف مرة واحدة هنا، وصفحة واحدة ديناميكية تعرضها جميعًا،
 * فإضافة تقرير جديد لا تحتاج صفحة ولا مسارًا جديدًا.
 */

import type { Module, Action } from '@/lib/auth/permissions'

export type ReportColumn = {
  key: string
  header: string
  /** المبالغ والأرقام تُحاذى لليسار داخل RTL */
  align?: 'start' | 'end' | 'center'
  format?: 'text' | 'money' | 'date' | 'number'
}

export type ReportDefinition = {
  slug: string
  title: string
  description: string
  group: 'cases' | 'hearings' | 'clients' | 'finance'
  icon: string
  module: Module
  action: Action
  columns: ReportColumn[]
  /** هل يقبل التقرير نطاقًا زمنيًا؟ */
  dateRange: boolean
  /** حقول تصفية إضافية يدعمها التقرير */
  filters?: ('lawyer' | 'court' | 'caseType' | 'status' | 'client')[]
  /** أعمدة تُجمَع في سطر الإجمالي */
  totals?: string[]
}

export const REPORT_GROUPS: Record<ReportDefinition['group'], string> = {
  cases: 'تقارير القضايا',
  hearings: 'تقارير الجلسات',
  clients: 'تقارير العملاء',
  finance: 'التقارير المالية',
}

export const REPORTS: ReportDefinition[] = [
  // ---------------- القضايا ----------------
  {
    slug: 'cases-all',
    title: 'جميع القضايا',
    description: 'قائمة كاملة بالقضايا مع العميل والمحكمة والمحامي والحالة',
    group: 'cases', icon: 'Briefcase', module: 'reports', action: 'view',
    dateRange: true,
    filters: ['lawyer', 'court', 'caseType', 'status'],
    columns: [
      { key: 'internal_no', header: 'رقم الملف' },
      { key: 'title', header: 'القضية' },
      { key: 'client_name', header: 'العميل' },
      { key: 'case_type', header: 'النوع' },
      { key: 'court_name', header: 'المحكمة' },
      { key: 'lawyer_name', header: 'المحامي' },
      { key: 'registered_at', header: 'تاريخ التسجيل', format: 'date' },
      { key: 'claim_amount', header: 'قيمة المطالبة', format: 'money', align: 'end' },
      { key: 'status_label', header: 'الحالة' },
    ],
    totals: ['claim_amount'],
  },
  {
    slug: 'cases-open',
    title: 'القضايا المفتوحة',
    description: 'القضايا التي لم تُغلق بعد',
    group: 'cases', icon: 'FolderOpen', module: 'reports', action: 'view',
    dateRange: true,
    filters: ['lawyer', 'court', 'caseType'],
    columns: [
      { key: 'internal_no', header: 'رقم الملف' },
      { key: 'title', header: 'القضية' },
      { key: 'client_name', header: 'العميل' },
      { key: 'court_name', header: 'المحكمة' },
      { key: 'lawyer_name', header: 'المحامي' },
      { key: 'priority_label', header: 'الأولوية' },
      { key: 'status_label', header: 'الحالة' },
    ],
  },
  {
    slug: 'cases-closed',
    title: 'القضايا المغلقة',
    description: 'القضايا المغلقة والمؤرشفة مع تاريخ الإغلاق وسببه',
    group: 'cases', icon: 'Archive', module: 'reports', action: 'view',
    dateRange: true,
    filters: ['lawyer', 'court', 'caseType'],
    columns: [
      { key: 'internal_no', header: 'رقم الملف' },
      { key: 'title', header: 'القضية' },
      { key: 'client_name', header: 'العميل' },
      { key: 'lawyer_name', header: 'المحامي' },
      { key: 'closed_at', header: 'تاريخ الإغلاق', format: 'date' },
      { key: 'close_reason', header: 'سبب الإغلاق' },
    ],
  },
  {
    slug: 'cases-by-lawyer',
    title: 'القضايا حسب المحامي',
    description: 'عدد القضايا وتوزيعها على كل محامٍ',
    group: 'cases', icon: 'UserCog', module: 'reports', action: 'view',
    dateRange: false,
    columns: [
      { key: 'lawyer_name', header: 'المحامي' },
      { key: 'total', header: 'إجمالي القضايا', format: 'number', align: 'end' },
      { key: 'open', header: 'مفتوحة', format: 'number', align: 'end' },
      { key: 'closed', header: 'مغلقة', format: 'number', align: 'end' },
    ],
    totals: ['total', 'open', 'closed'],
  },
  {
    slug: 'cases-by-court',
    title: 'القضايا حسب المحكمة',
    description: 'توزيع القضايا على المحاكم',
    group: 'cases', icon: 'Gavel', module: 'reports', action: 'view',
    dateRange: false,
    columns: [
      { key: 'court_name', header: 'المحكمة' },
      { key: 'governorate', header: 'المحافظة' },
      { key: 'total', header: 'عدد القضايا', format: 'number', align: 'end' },
    ],
    totals: ['total'],
  },
  {
    slug: 'cases-by-type',
    title: 'القضايا حسب النوع',
    description: 'توزيع القضايا على أنواعها',
    group: 'cases', icon: 'ChartColumn', module: 'reports', action: 'view',
    dateRange: false,
    columns: [
      { key: 'case_type', header: 'نوع القضية' },
      { key: 'total', header: 'عدد القضايا', format: 'number', align: 'end' },
      { key: 'open', header: 'مفتوحة', format: 'number', align: 'end' },
    ],
    totals: ['total', 'open'],
  },

  // ---------------- الجلسات ----------------
  {
    slug: 'hearings-upcoming',
    title: 'الجلسات القادمة',
    description: 'الجلسات المجدولة من اليوم فصاعدًا',
    group: 'hearings', icon: 'CalendarDays', module: 'reports', action: 'view',
    dateRange: true,
    filters: ['lawyer', 'court'],
    columns: [
      { key: 'hearing_date', header: 'التاريخ', format: 'date' },
      { key: 'hearing_time', header: 'الوقت' },
      { key: 'case_title', header: 'القضية' },
      { key: 'client_name', header: 'العميل' },
      { key: 'court_name', header: 'المحكمة' },
      { key: 'room', header: 'القاعة' },
      { key: 'lawyer_name', header: 'المحامي المكلّف' },
    ],
  },
  {
    slug: 'hearings-results',
    title: 'نتائج الجلسات',
    description: 'الجلسات المنعقدة ونتائجها وقراراتها',
    group: 'hearings', icon: 'ClipboardCheck', module: 'reports', action: 'view',
    dateRange: true,
    filters: ['lawyer', 'court'],
    columns: [
      { key: 'hearing_date', header: 'التاريخ', format: 'date' },
      { key: 'case_title', header: 'القضية' },
      { key: 'court_name', header: 'المحكمة' },
      { key: 'status_label', header: 'الحالة' },
      { key: 'result', header: 'النتيجة' },
      { key: 'decision', header: 'القرار' },
    ],
  },

  // ---------------- العملاء ----------------
  {
    slug: 'clients-active',
    title: 'العملاء النشطون',
    description: 'العملاء الفعّالون مع بيانات الاتصال والمحامي المسؤول',
    group: 'clients', icon: 'Users', module: 'reports', action: 'view',
    dateRange: true,
    filters: ['lawyer'],
    columns: [
      { key: 'client_no', header: 'رقم العميل' },
      { key: 'name', header: 'الاسم' },
      { key: 'client_type', header: 'النوع' },
      { key: 'phone', header: 'الهاتف' },
      { key: 'lawyer_name', header: 'المحامي المسؤول' },
      { key: 'file_opened_at', header: 'تاريخ فتح الملف', format: 'date' },
    ],
  },
  {
    slug: 'clients-by-cases',
    title: 'العملاء حسب عدد القضايا',
    description: 'ترتيب العملاء تنازليًا بعدد قضاياهم',
    group: 'clients', icon: 'Briefcase', module: 'reports', action: 'view',
    dateRange: false,
    columns: [
      { key: 'client_no', header: 'رقم العميل' },
      { key: 'name', header: 'العميل' },
      { key: 'total', header: 'إجمالي القضايا', format: 'number', align: 'end' },
      { key: 'open', header: 'مفتوحة', format: 'number', align: 'end' },
    ],
    totals: ['total', 'open'],
  },
  {
    slug: 'clients-receivables',
    title: 'العملاء المستحق عليهم',
    description: 'أرصدة العملاء غير المسدّدة',
    group: 'clients', icon: 'Receipt', module: 'reports', action: 'view',
    dateRange: false,
    columns: [
      { key: 'client_no', header: 'رقم العميل' },
      { key: 'name', header: 'العميل' },
      { key: 'billed', header: 'إجمالي الفواتير', format: 'money', align: 'end' },
      { key: 'paid', header: 'المحصّل', format: 'money', align: 'end' },
      { key: 'outstanding', header: 'المتبقي', format: 'money', align: 'end' },
    ],
    totals: ['billed', 'paid', 'outstanding'],
  },

  // ---------------- المالية ----------------
  {
    slug: 'finance-payments',
    title: 'المقبوضات',
    description: 'كل الدفعات المستلمة خلال الفترة',
    group: 'finance', icon: 'HandCoins', module: 'reports', action: 'view',
    dateRange: true,
    filters: ['client'],
    columns: [
      { key: 'receipt_no', header: 'رقم الإيصال' },
      { key: 'paid_at', header: 'التاريخ', format: 'date' },
      { key: 'client_name', header: 'العميل' },
      { key: 'case_title', header: 'القضية' },
      { key: 'method_label', header: 'طريقة الدفع' },
      { key: 'amount', header: 'المبلغ', format: 'money', align: 'end' },
    ],
    totals: ['amount'],
  },
  {
    slug: 'finance-expenses',
    title: 'المصروفات',
    description: 'كل المصروفات خلال الفترة مصنّفة',
    group: 'finance', icon: 'TrendingDown', module: 'reports', action: 'view',
    dateRange: true,
    filters: ['client'],
    columns: [
      { key: 'spent_at', header: 'التاريخ', format: 'date' },
      { key: 'category', header: 'النوع' },
      { key: 'description', header: 'البيان' },
      { key: 'case_title', header: 'القضية' },
      { key: 'client_name', header: 'العميل' },
      { key: 'amount', header: 'المبلغ', format: 'money', align: 'end' },
    ],
    totals: ['amount'],
  },
  {
    slug: 'finance-invoices',
    title: 'الفواتير',
    description: 'الفواتير الصادرة وحالة سدادها',
    group: 'finance', icon: 'Receipt', module: 'reports', action: 'view',
    dateRange: true,
    filters: ['client', 'status'],
    columns: [
      { key: 'invoice_no', header: 'رقم الفاتورة' },
      { key: 'issue_date', header: 'التاريخ', format: 'date' },
      { key: 'client_name', header: 'العميل' },
      { key: 'total', header: 'الإجمالي', format: 'money', align: 'end' },
      { key: 'paid_amount', header: 'المدفوع', format: 'money', align: 'end' },
      { key: 'remaining', header: 'المتبقي', format: 'money', align: 'end' },
      { key: 'status_label', header: 'الحالة' },
    ],
    totals: ['total', 'paid_amount', 'remaining'],
  },
  {
    slug: 'finance-receivables',
    title: 'الذمم المدينة',
    description: 'الفواتير غير المسدّدة بالكامل',
    group: 'finance', icon: 'Wallet', module: 'reports', action: 'view',
    dateRange: false,
    filters: ['client'],
    columns: [
      { key: 'invoice_no', header: 'رقم الفاتورة' },
      { key: 'issue_date', header: 'التاريخ', format: 'date' },
      { key: 'due_date', header: 'الاستحقاق', format: 'date' },
      { key: 'client_name', header: 'العميل' },
      { key: 'remaining', header: 'المتبقي', format: 'money', align: 'end' },
      { key: 'status_label', header: 'الحالة' },
    ],
    totals: ['remaining'],
  },
  {
    slug: 'finance-lawyer-fees',
    title: 'أتعاب المحامين',
    description: 'الأتعاب المتعاقد عليها والمحصّلة لكل محامٍ',
    group: 'finance', icon: 'Banknote', module: 'reports', action: 'view',
    dateRange: false,
    columns: [
      { key: 'lawyer_name', header: 'المحامي' },
      { key: 'cases_count', header: 'عدد القضايا', format: 'number', align: 'end' },
      { key: 'fees_total', header: 'الأتعاب المتعاقدة', format: 'money', align: 'end' },
      { key: 'collected', header: 'المحصّل', format: 'money', align: 'end' },
      { key: 'outstanding', header: 'المتبقي', format: 'money', align: 'end' },
    ],
    totals: ['cases_count', 'fees_total', 'collected', 'outstanding'],
  },
  {
    slug: 'finance-profit',
    title: 'الأرباح',
    description: 'الإيرادات مقابل المصروفات شهريًا وصافي الربح',
    group: 'finance', icon: 'ChartColumn', module: 'reports', action: 'view',
    dateRange: true,
    columns: [
      { key: 'month', header: 'الشهر' },
      { key: 'income', header: 'الإيرادات', format: 'money', align: 'end' },
      { key: 'expense', header: 'المصروفات', format: 'money', align: 'end' },
      { key: 'net', header: 'صافي الربح', format: 'money', align: 'end' },
    ],
    totals: ['income', 'expense', 'net'],
  },
]

export function findReport(slug: string): ReportDefinition | undefined {
  return REPORTS.find((r) => r.slug === slug)
}

/** التقارير المالية تتطلّب صلاحية مالية إضافية فوق reports.view. */
export const FINANCE_REPORT_SLUGS = new Set(
  REPORTS.filter((r) => r.group === 'finance').map((r) => r.slug),
)
