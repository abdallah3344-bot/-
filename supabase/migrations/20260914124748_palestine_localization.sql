-- ============================================================
-- توطين النظام للسياق الفلسطيني
-- ------------------------------------------------------------
-- النظام موجَّه لمكاتب المحاماة في فلسطين: المحاكم وأنواع القضايا
-- ونسبة ضريبة القيمة المضافة تتبع النظام القضائي الفلسطيني.
-- كل ما يلي قابل للتعديل من «الإعدادات ← جداول المراجع».
-- ============================================================

-- 1) ضريبة القيمة المضافة في فلسطين 16% بدل 15%
alter table public.settings alter column tax_rate set default 16;
update public.settings set tax_rate = 16 where tax_rate = 15;

-- 2) تنظيف بقايا الاختبارات من أنواع القضايا
delete from public.case_types
where name_ar ~ '^قضايا تحكيم [0-9]{6}$'
  and not exists (select 1 from public.cases c where c.case_type_id = case_types.id);

-- 3) أنواع القضايا بالتسمية الفلسطينية
--    نُعيد تسمية المستعمَل بدل حذفه حتى لا تفقد القضايا القائمة نوعها.
update public.case_types set name_ar = 'حقوق' where name_ar = 'مدنية';
update public.case_types set name_ar = 'جزاء' where name_ar = 'جزائية';
update public.case_types set name_ar = 'أحوال شخصية شرعية' where name_ar = 'شرعية';
update public.case_types set name_ar = 'أراضي وتسوية' where name_ar = 'عقارية';

-- الأنواع التي لا مقابل لها في الممارسة الفلسطينية: تُخفى ولا تُحذف
-- (قد تكون مرتبطة بقضايا)
update public.case_types set is_active = false
where name_ar in ('أسرية', 'بنكية');

insert into public.case_types (name_ar, sort_order, is_active) values
  ('حقوق',                      10, true),
  ('جزاء',                      20, true),
  ('جنايات كبرى',               30, true),
  ('تنفيذ',                     40, true),
  ('أحوال شخصية شرعية',         50, true),
  ('أحوال شخصية كنسية',         60, true),
  ('عمالية',                    70, true),
  ('تجارية',                    80, true),
  ('إدارية (عدل عليا)',         90, true),
  ('أراضي وتسوية',             100, true),
  ('إيجارات',                  110, true),
  ('تعويضات وحوادث طرق',       120, true),
  ('شيكات وأوراق تجارية',      130, true),
  ('ضريبية وجمارك',            140, true),
  ('مخالفات بلدية وسير',       150, true),
  ('تحكيم',                    160, true),
  ('دستورية',                  170, true),
  ('شركات',                    180, true),
  ('تأمين',                    190, true)
on conflict (name_ar) do update
  set sort_order = excluded.sort_order,
      is_active  = true;

-- 4) المحاكم الفلسطينية
--    تُحذف المحاكم غير الفلسطينية غير المرتبطة بقضايا؛ والمرتبطة تُخفى.
update public.courts set is_active = false
where governorate is not null
  and governorate not in (
    'القدس','رام الله والبيرة','نابلس','الخليل','بيت لحم','جنين','طولكرم',
    'قلقيلية','سلفيت','طوباس','أريحا والأغوار',
    'غزة','شمال غزة','دير البلح','خان يونس','رفح'
  );

delete from public.courts
where is_active = false
  and not exists (select 1 from public.cases c where c.court_id = courts.id);

-- محاكم على مستوى الوطن
insert into public.courts (name_ar, court_type, governorate, is_active) values
  ('المحكمة الدستورية العليا',      'constitutional', 'رام الله والبيرة', true),
  ('محكمة النقض',                   'cassation',      'رام الله والبيرة', true),
  ('محكمة العدل العليا',            'high_justice',   'رام الله والبيرة', true),
  ('المحكمة العليا الشرعية',        'sharia',         'رام الله والبيرة', true),
  ('محكمة استئناف رام الله',        'appeal',         'رام الله والبيرة', true),
  ('محكمة استئناف القدس',           'appeal',         'القدس',            true),
  ('محكمة استئناف غزة',             'appeal',         'غزة',              true),
  ('محكمة الاستئناف الشرعية',       'sharia',         'رام الله والبيرة', true)
on conflict (name_ar, governorate) do update
  set court_type = excluded.court_type, is_active = true;

-- محاكم البداية والصلح والشرعية في مراكز المحافظات
insert into public.courts (name_ar, court_type, governorate, is_active)
select
  prefix || ' ' || centre,
  ctype,
  gov,
  true
from (values
  ('رام الله', 'رام الله والبيرة'),
  ('نابلس',    'نابلس'),
  ('الخليل',   'الخليل'),
  ('بيت لحم',  'بيت لحم'),
  ('جنين',     'جنين'),
  ('طولكرم',   'طولكرم'),
  ('قلقيلية',  'قلقيلية'),
  ('سلفيت',    'سلفيت'),
  ('طوباس',    'طوباس'),
  ('أريحا',    'أريحا والأغوار'),
  ('غزة',      'غزة'),
  ('جباليا',   'شمال غزة'),
  ('دير البلح','دير البلح'),
  ('خان يونس', 'خان يونس'),
  ('رفح',      'رفح')
) as centres(centre, gov)
cross join (values
  ('محكمة صلح',    'magistrate'),
  ('محكمة بداية',  'first_instance'),
  ('محكمة شرعية',  'sharia')
) as kinds(prefix, ctype)
on conflict (name_ar, governorate) do update
  set court_type = excluded.court_type, is_active = true;;
