import type { Module } from '@/lib/auth/permissions'

export type NavItem = {
  href: string
  label: string
  icon: string
  module: Module
  /** مجموعة العناصر في الشريط الجانبي */
  group: 'main' | 'work' | 'finance' | 'admin'
}

/**
 * القائمة الرئيسية — 22 عنصرًا.
 * كل عنصر مربوط بوحدة صلاحيات؛ لا يظهر إلا لمن يملك صلاحية عليها.
 */
export const NAVIGATION: NavItem[] = [
  { href: '/dashboard',          label: 'لوحة التحكم',          icon: 'LayoutDashboard', module: 'dashboard',      group: 'main' },

  { href: '/clients',            label: 'العملاء',              icon: 'Users',           module: 'clients',        group: 'work' },
  { href: '/cases',              label: 'القضايا',              icon: 'Briefcase',       module: 'cases',          group: 'work' },
  { href: '/hearings',           label: 'الجلسات',              icon: 'Gavel',           module: 'hearings',       group: 'work' },
  { href: '/calendar',           label: 'التقويم',              icon: 'CalendarDays',    module: 'calendar',       group: 'work' },
  { href: '/tasks',              label: 'المهام',               icon: 'ListChecks',      module: 'tasks',          group: 'work' },
  { href: '/documents',          label: 'المستندات',            icon: 'FolderOpen',      module: 'documents',      group: 'work' },
  { href: '/powers-of-attorney', label: 'الوكالات',             icon: 'ScrollText',      module: 'poa',            group: 'work' },
  { href: '/templates',          label: 'قوالب المستندات',      icon: 'FileStack',       module: 'documents',      group: 'work' },
  { href: '/contracts',          label: 'العقود',               icon: 'FileSignature',   module: 'contracts',      group: 'work' },

  { href: '/fees',               label: 'أتعاب المحاماة',       icon: 'Banknote',        module: 'fees',           group: 'finance' },
  { href: '/invoices',           label: 'الفواتير',             icon: 'Receipt',         module: 'invoices',       group: 'finance' },
  { href: '/payments',           label: 'المقبوضات',            icon: 'HandCoins',       module: 'payments',       group: 'finance' },
  { href: '/expenses',           label: 'المصروفات',            icon: 'TrendingDown',    module: 'expenses',       group: 'finance' },
  { href: '/accounts',           label: 'الحسابات',             icon: 'Wallet',          module: 'accounts',       group: 'finance' },

  { href: '/correspondence',     label: 'المراسلات',            icon: 'Mails',           module: 'correspondence', group: 'admin' },
  { href: '/staff',              label: 'المحامون والموظفون',   icon: 'UserCog',         module: 'staff',          group: 'admin' },
  { href: '/reports',            label: 'التقارير',             icon: 'ChartColumn',     module: 'reports',        group: 'admin' },
  { href: '/archive',            label: 'الأرشيف',              icon: 'Archive',         module: 'archive',        group: 'admin' },
  { href: '/notifications',      label: 'التنبيهات',            icon: 'Bell',            module: 'notifications',  group: 'admin' },
  { href: '/settings',           label: 'الإعدادات',            icon: 'Settings',        module: 'settings',       group: 'admin' },
  { href: '/users',              label: 'المستخدمون والصلاحيات', icon: 'ShieldCheck',     module: 'users',          group: 'admin' },
  { href: '/audit-log',          label: 'سجل العمليات',         icon: 'History',         module: 'audit',          group: 'admin' },
]

export const GROUP_LABELS: Record<NavItem['group'], string> = {
  main: '',
  work: 'إدارة القضايا',
  finance: 'الشؤون المالية',
  admin: 'الإدارة والتقارير',
}
