-- ============================================================
-- بذر الأدوار والصلاحيات
-- ============================================================

insert into public.roles (code, name_ar, description, is_system) values
  ('super_admin',    'مدير النظام',  'صلاحية كاملة على كل أجزاء النظام بما فيها المستخدمون وسجل العمليات', true),
  ('office_manager', 'مدير المكتب',  'إدارة المكتب والقضايا والعملاء والشؤون المالية والتقارير', true),
  ('lawyer',         'محامي',        'الوصول إلى القضايا والعملاء المسندة إليه فقط', true),
  ('secretary',      'سكرتير',       'العملاء والجلسات والمواعيد والمستندات والمراسلات', true),
  ('accountant',     'محاسب',        'الجانب المالي: الأتعاب والفواتير والمقبوضات والمصروفات والحسابات', true),
  ('custom',         'مستخدم مخصص',  'دور بلا صلاحيات افتراضية — تُمنح يدويًا لكل مستخدم', true);

-- ------------------------------------------------------------
-- الصلاحيات: module × action
-- ------------------------------------------------------------
with modules(module, label_ar, actions) as (
  values
    ('dashboard',      'لوحة التحكم',        array['view']),
    ('clients',        'العملاء',            array['view','create','update','delete','print','export']),
    ('cases',          'القضايا',            array['view','create','update','delete','print','export','approve']),
    ('hearings',       'الجلسات',            array['view','create','update','delete','print','export']),
    ('calendar',       'التقويم',            array['view','create','update','delete']),
    ('tasks',          'المهام',             array['view','create','update','delete','export']),
    ('documents',      'المستندات',          array['view','create','update','delete','download','print','export']),
    ('poa',            'الوكالات',           array['view','create','update','delete','print','export','download']),
    ('contracts',      'العقود',             array['view','create','update','delete','print','export','download']),
    ('fees',           'أتعاب المحاماة',     array['view','create','update','delete','print','export','approve']),
    ('invoices',       'الفواتير',           array['view','create','update','delete','print','export','approve']),
    ('payments',       'المقبوضات',          array['view','create','update','delete','print','export']),
    ('expenses',       'المصروفات',          array['view','create','update','delete','print','export','approve']),
    ('accounts',       'الحسابات',           array['view','create','update','delete','print','export']),
    ('correspondence', 'المراسلات',          array['view','create','update','delete','print','export','download']),
    ('staff',          'المحامون والموظفون', array['view','create','update','delete','export']),
    ('reports',        'التقارير',           array['view','print','export']),
    ('archive',        'الأرشيف',            array['view','update','approve','export']),
    ('notifications',  'التنبيهات',          array['view','update']),
    ('settings',       'الإعدادات',          array['view','update']),
    ('users',          'المستخدمون والصلاحيات', array['view','create','update','delete','approve']),
    ('audit',          'سجل العمليات',       array['view','export'])
),
action_labels(action, label_ar) as (
  values
    ('view','عرض'), ('create','إضافة'), ('update','تعديل'), ('delete','حذف'),
    ('print','طباعة'), ('export','تصدير'), ('download','تحميل'), ('approve','اعتماد')
)
insert into public.permissions (code, module, action, label_ar)
select
  m.module || '.' || a.action,
  m.module,
  a.action,
  al.label_ar || ' — ' || m.label_ar
from modules m
cross join lateral unnest(m.actions) as a(action)
join action_labels al on al.action = a.action;

-- ------------------------------------------------------------
-- مدير النظام: كل شيء
-- ------------------------------------------------------------
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r cross join public.permissions p
where r.code = 'super_admin';

-- ------------------------------------------------------------
-- مدير المكتب: كل شيء عدا إدارة المستخدمين (يبقى له عرضهم)
-- ------------------------------------------------------------
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r cross join public.permissions p
where r.code = 'office_manager'
  and (p.module <> 'users' or p.action = 'view');

-- ------------------------------------------------------------
-- محامي
-- ------------------------------------------------------------
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r join public.permissions p on p.code = any (array[
  'dashboard.view',
  'clients.view','clients.create','clients.update','clients.print','clients.export',
  'cases.view','cases.create','cases.update','cases.print','cases.export',
  'hearings.view','hearings.create','hearings.update','hearings.print','hearings.export',
  'calendar.view','calendar.create','calendar.update','calendar.delete',
  'tasks.view','tasks.create','tasks.update','tasks.delete','tasks.export',
  'documents.view','documents.create','documents.update','documents.download','documents.print',
  'poa.view','poa.create','poa.update','poa.print','poa.download',
  'contracts.view','contracts.create','contracts.update','contracts.print','contracts.download',
  'fees.view',
  'invoices.view','invoices.print',
  'payments.view',
  'expenses.view','expenses.create',
  'correspondence.view','correspondence.create','correspondence.update','correspondence.download',
  'staff.view',
  'reports.view','reports.print','reports.export',
  'archive.view',
  'notifications.view','notifications.update',
  'settings.view'
])
where r.code = 'lawyer';

-- ------------------------------------------------------------
-- سكرتير: بلا أي وصول مالي
-- ------------------------------------------------------------
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r join public.permissions p on p.code = any (array[
  'dashboard.view',
  'clients.view','clients.create','clients.update','clients.print','clients.export',
  'cases.view','cases.print',
  'hearings.view','hearings.create','hearings.update','hearings.delete','hearings.print','hearings.export',
  'calendar.view','calendar.create','calendar.update','calendar.delete',
  'tasks.view','tasks.create','tasks.update','tasks.delete','tasks.export',
  'documents.view','documents.create','documents.update','documents.download','documents.print',
  'poa.view','poa.create','poa.update','poa.print','poa.download',
  'contracts.view','contracts.print','contracts.download',
  'correspondence.view','correspondence.create','correspondence.update','correspondence.delete','correspondence.print','correspondence.download',
  'staff.view',
  'reports.view','reports.print',
  'archive.view',
  'notifications.view','notifications.update',
  'settings.view'
])
where r.code = 'secretary';

-- ------------------------------------------------------------
-- محاسب: مالي كامل، والقضايا والعملاء قراءة فقط
-- ------------------------------------------------------------
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r join public.permissions p on (
     p.module in ('fees','invoices','payments','expenses','accounts')
  or p.code = any (array[
       'dashboard.view',
       'clients.view','clients.print','clients.export',
       'cases.view','cases.print',
       'reports.view','reports.print','reports.export',
       'archive.view',
       'notifications.view','notifications.update',
       'settings.view'
     ])
)
where r.code = 'accountant';

-- 'custom' يبقى بلا صلاحيات — تُمنح يدويًا عبر user_permissions
;