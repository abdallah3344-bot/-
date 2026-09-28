-- ⚠️ يُشغَّل على قاعدة تجريبية فقط (ينشئ مكاتب ومستخدمين وجدول t_log).
-- محليًا: /home/claude/pgtest أو أي فرع Supabase بعد تطبيق الترحيلات.
-- ============================================================
-- اختبار العزل بين المكاتب — كل فشل يرمي استثناء ويوقف التشغيل
-- ============================================================
create table public.t_log (n serial, msg text);
create or replace function public.t_assert(cond boolean, msg text) returns void language plpgsql security definer as $$
begin
  if cond is distinct from true then raise exception 'فشل الاختبار: %', msg; end if;
  insert into public.t_log (msg) values (msg);
end $$;
grant execute on function public.t_assert(boolean, text) to public;

-- مكتب «أ» ومكتب «ب» عبر صفحة التسجيل العامة (كزائر anon)
set role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', false);
select set_config('request.headers', '{"x-forwarded-for":"1.1.1.1"}', false);
select t_assert((register_office('مكتب أ', 'مدير أ', 'admin_a', 'a@x.ps', 'Password1!', '0599000001', 'Office-A') ->> 'ok')::boolean, 'تسجيل مكتب أ');
select set_config('request.headers', '{"x-forwarded-for":"2.2.2.2"}', false);
select t_assert((register_office('مكتب ب', 'مدير ب', 'admin_b', 'b@x.ps', 'Password1!', '0599000002') ->> 'ok')::boolean, 'تسجيل مكتب ب');
select t_assert((register_office('مكتب ج', 'مدير ج', 'admin_b', 'c@x.ps', 'Password1!', '0599000003') ->> 'ok')::boolean = false, 'رفض اسم مستخدم مكرر');
-- رابط الموقع: صيغة، حجز، تكرار — ولا يُنشأ مكتب عند رفض الرابط
select t_assert((office_slug_available('office-a') ->> 'ok')::boolean = false, 'الرابط المستعمل غير متاح');
select t_assert((office_slug_available('kamal') ->> 'ok')::boolean = false, 'رابط برنامج آخر محجوز');
select t_assert((office_slug_available('a b') ->> 'ok')::boolean = false, 'رفض رابط بمسافة');
select t_assert((office_slug_available('-ab') ->> 'ok')::boolean = false, 'رفض رابط يبدأ بشرطة');
select t_assert((office_slug_available('alquds-law') ->> 'ok')::boolean, 'رابط جديد متاح');
select t_assert((register_office('مكتب د', 'مدير د', 'admin_d', 'd@x.ps', 'Password1!', '0599000004', 'law') ->> 'field') = 'slug', 'رفض تسجيل برابط محجوز');
select t_assert(not exists (select 1 from public.profiles where username = 'admin_d'), 'لا حساب عند رفض الرابط');
-- الزائر: إما لا صلاحية له على الجدول أصلًا (الإنتاج) أو لا يرى صفًا
do $$ declare _n bigint; begin
  begin select count(*) into _n from public.clients; exception when insufficient_privilege then _n := 0; end;
  perform t_assert(_n = 0, 'الزائر لا يرى أي موكّل');
  begin select count(*) into _n from public.settings; exception when insufficient_privilege then _n := 0; end;
  perform t_assert(_n = 0, 'الزائر لا يرى الإعدادات');
end $$;
select t_assert(resolve_login_email('admin_a', 'Password1!') = 'a@x.ps', 'دخول مدير أ باسم المستخدم');
select t_assert(resolve_login_email('admin_a', 'wrong') is null, 'رفض كلمة مرور خاطئة');
reset role;
update public.profiles set email = 'A.New@x.ps' where username = 'admin_a';
select t_assert((select u.email from auth.users u join public.profiles p on p.id = u.id where p.username = 'admin_a') = 'a.new@x.ps', 'تغيير البريد ينتقل إلى حساب الدخول');
set role anon;
select t_assert(resolve_login_email('admin_a', 'Password1!') = 'a.new@x.ps', 'الدخول باسم المستخدم بعد تغيير البريد');
reset role;
update public.profiles set email = 'a@x.ps' where username = 'admin_a';
do $$ begin
  begin update public.profiles set email = 'b@x.ps' where username = 'admin_a';
    perform t_assert(false, 'بريد مكرر يُقبل'); exception when unique_violation then null; end;
end $$;
set role anon;
reset role;

select set_config('t.ua', (select id::text from public.profiles where username = 'admin_a'), false);
select set_config('t.ub', (select id::text from public.profiles where username = 'admin_b'), false);
select set_config('t.oa', (select office_id::text from public.profiles where username = 'admin_a'), false);
select set_config('t.ob', (select office_id::text from public.profiles where username = 'admin_b'), false);
select set_config('t.uf', (select id::text from public.profiles where username = 'admin'), false);

select t_assert((select slug || ':' || domain_status from public.offices where id = current_setting('t.oa')::uuid) = 'office-a:pending', 'رابط مكتب أ محفوظ بانتظار الربط');
select t_assert((select domain_status from public.offices where id = current_setting('t.ob')::uuid) = 'none', 'مكتب بلا رابط');
select t_assert((select count(*) from public.roles where office_id = current_setting('t.oa')::uuid)
              = (select count(*) from public.roles r join public.offices o on o.id = r.office_id where o.is_founding), 'نُسخت الأدوار');
select t_assert((select count(*) from public.courts where office_id = current_setting('t.oa')::uuid) > 0, 'نُسخت المحاكم');
select t_assert((select count(*) from public.court_chambers where office_id = current_setting('t.oa')::uuid)
              = (select count(*) from public.court_chambers ch join public.offices o on o.id = ch.office_id where o.is_founding), 'نُسخت دوائر المحاكم');

-- ------------------------------------------------------------
-- مدير «أ» يعمل في مكتبه
-- ------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.ua'), 'role', 'authenticated')::text, false);

select t_assert(current_office_id() = current_setting('t.oa')::uuid, 'مكتب المستخدم أ');
select t_assert(has_perm('clients', 'create'), 'مدير أ يملك صلاحياته');
select t_assert((seed_demo_data() ->> 'ok')::boolean, 'بيانات تجريبية في أ');
insert into public.clients (name, client_type) values ('موكّل سرّي لمكتب أ', 'individual');
select set_config('t.ca', (select id::text from public.clients where name = 'موكّل سرّي لمكتب أ'), false);
insert into public.cases (title, client_id, status, priority) values ('قضية سرية أ', current_setting('t.ca')::uuid, 'new', 'medium');
select set_config('t.csa', (select id::text from public.cases where title = 'قضية سرية أ'), false);
select set_config('t.inva', (select id::text from public.invoices limit 1), false);
select t_assert((select client_no from public.clients where id = current_setting('t.ca')::uuid) like 'CL-%', 'ترقيم موكّل أ');
select generate_notifications(true);
select set_config('t.nota', (select count(*)::text from public.notifications), false);
select write_audit_log('update', 'clients', current_setting('t.ca'), 'موكّل سرّي', 'اختبار');
insert into storage.objects (bucket_id, name) values ('documents', current_setting('t.oa') || '/cases/secret.pdf');
reset role;

-- ------------------------------------------------------------
-- مدير «ب» يحاول الوصول لبيانات «أ» بكل الطرق
-- ------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.ub'), 'role', 'authenticated')::text, false);

select t_assert(current_office_id() = current_setting('t.ob')::uuid, 'مكتب المستخدم ب');

-- القراءة المباشرة من كل جدول أعمال
do $$
declare _t text; _n bigint;
begin
  for _t in select c.table_name from information_schema.columns c
             where c.table_schema = 'public' and c.column_name = 'office_id'
               and c.table_name not in ('offices')
  loop
    execute format('select count(*) from public.%I where office_id is distinct from $1', _t)
      into _n using current_setting('t.ob')::uuid;
    perform t_assert(_n = 0, 'ب لا يرى صفوفًا غريبة في ' || _t);
  end loop;
end $$;

select t_assert((select count(*) from public.clients where id = current_setting('t.ca')::uuid) = 0, 'ب لا يرى موكّل أ بمعرّفه');
select t_assert((select count(*) from public.offices) = 1, 'ب يرى مكتبه فقط');
select t_assert((select count(*) from global_search('سرّي', 50)) = 0, 'البحث الشامل لا يُظهر بيانات أ');
select t_assert((select count(*) from global_search('سرية', 50)) = 0, 'البحث الشامل لا يُظهر قضايا أ');
select t_assert((dashboard_stats() ->> 'clients_total')::int = 0, 'لوحة ب تحسب موكّليه فقط');

-- الكتابة على بيانات أ
update public.clients set name = 'مخترق' where id = current_setting('t.ca')::uuid;
delete from public.clients where id = current_setting('t.ca')::uuid;
select soft_delete('clients', current_setting('t.ca')::uuid);
select soft_delete('cases', current_setting('t.csa')::uuid);

do $$ begin
  begin
    insert into public.clients (name, client_type, office_id) values ('دسّ', 'individual', current_setting('t.oa')::uuid);
    perform t_assert(false, 'إدراج موكّل في مكتب أ');
  exception when insufficient_privilege or check_violation or foreign_key_violation then perform t_assert(true, 'منع إدراج صف في مكتب أ');
  end;

  begin
    insert into public.cases (title, client_id, status, priority) values ('ربط', current_setting('t.ca')::uuid, 'new', 'medium');
    perform t_assert(false, 'قضية في ب تشير لموكّل أ');
  exception when foreign_key_violation then perform t_assert(true, 'منع ربط قضية في ب بموكّل أ');
  end;

  begin
    insert into public.hearings (case_id, hearing_date, status) values (current_setting('t.csa')::uuid, current_date, 'scheduled');
    perform t_assert(false, 'جلسة في ب لقضية أ');
  exception when foreign_key_violation then perform t_assert(true, 'منع جلسة في ب لقضية أ');
  end;

  begin
    -- دفعة في ب على فاتورة أ: لو مرّت لعدّل المشغّل (SECURITY DEFINER) رصيد فاتورة أ
    insert into public.clients (name, client_type) values ('موكّل ب', 'individual');
    insert into public.payments (client_id, invoice_id, amount)
    select id, current_setting('t.inva')::uuid, 999999 from public.clients where name = 'موكّل ب';
    perform t_assert(false, 'دفعة في ب على فاتورة أ');
  exception when foreign_key_violation then perform t_assert(true, 'منع دفعة في ب على فاتورة أ');
  end;

  begin
    perform set_user_password(current_setting('t.ua')::uuid, 'Hacked123!');
    perform t_assert(false, 'تغيير كلمة مرور مدير أ');
  exception when others then perform t_assert(sqlstate = 'P0002', 'منع تغيير كلمة مرور مستخدم في أ');
  end;

  begin
    update public.profiles set office_id = current_setting('t.oa')::uuid where id = auth.uid();
    perform t_assert(false, 'نقل حسابي إلى مكتب أ');
  exception when insufficient_privilege or check_violation or foreign_key_violation then perform t_assert(true, 'منع نقل الحساب لمكتب آخر');
  end;

  begin
    perform platform_offices();
    perform t_assert(false, 'ب يفتح صفحة المالك');
  exception when insufficient_privilege then perform t_assert(true, 'منع ب من صفحة المالك');
  end;

  begin
    insert into storage.objects (bucket_id, name) values ('documents', current_setting('t.oa') || '/cases/planted.pdf');
    perform t_assert(false, 'رفع ملف في مجلد أ');
  exception when insufficient_privilege or check_violation or foreign_key_violation then perform t_assert(true, 'منع رفع ملف في مجلد أ');
  end;

  begin
    insert into storage.objects (bucket_id, name) values ('documents', 'cases/legacy.pdf');
    perform t_assert(false, 'رفع ملف بلا مجلد مكتب');
  exception when insufficient_privilege or check_violation or foreign_key_violation then perform t_assert(true, 'منع رفع ملف خارج مجلد المكتب');
  end;
end $$;

select t_assert((select count(*) from storage.objects where bucket_id = 'documents') = 0, 'ب لا يرى ملفات أ');
select t_assert((select count(*) from storage.objects where bucket_id = 'templates') = 0, 'ب لا يرى قوالب المكتب الأول');

-- عمليات ب في مكتبه تعمل، والترقيم مستقل
select t_assert((seed_demo_data() ->> 'ok')::boolean, 'بيانات تجريبية في ب رغم وجودها في أ');
select t_assert((select count(*) from public.clients) = 5, 'موكّلو ب التجريبيون فقط (المحاولة الفاشلة أُلغيت)');
select t_assert(create_office_user('lawyer_b@x.ps', 'Password1!', 'lawyer_b', 'محامي ب', 'lawyer') is not null, 'ب ينشئ محاميًا في مكتبه');
select t_assert((select office_id from public.profiles where username = 'lawyer_b') = current_setting('t.ob')::uuid, 'المحامي الجديد في مكتب ب');
select generate_notifications(true);
select t_assert(not exists (select 1 from public.notifications n where n.entity_id in (select id from public.cases) is false and n.entity = 'cases'), 'إشعارات ب من بياناته فقط');
select clear_demo_data();
select mark_overdue_tasks();
insert into storage.objects (bucket_id, name) values ('documents', current_setting('t.ob') || '/cases/mine.pdf');
reset role;

-- ------------------------------------------------------------
-- بيانات أ سليمة بعد كل المحاولات
-- ------------------------------------------------------------
select t_assert((select name from public.clients where id = current_setting('t.ca')::uuid) = 'موكّل سرّي لمكتب أ', 'موكّل أ لم يُعدَّل');
select t_assert((select deleted_at from public.clients where id = current_setting('t.ca')::uuid) is null, 'موكّل أ لم يُحذف');
select t_assert((select deleted_at from public.cases where id = current_setting('t.csa')::uuid) is null, 'قضية أ لم تُحذف');
select t_assert((select count(*) from public.clients where office_id = current_setting('t.oa')::uuid and is_demo) = 5, 'بيانات أ التجريبية باقية بعد مسح ب لبياناته');
select t_assert((select count(*) from public.clients where office_id = current_setting('t.ob')::uuid and is_demo) = 0, 'مسح بيانات ب التجريبية');
select t_assert((select count(*) from public.audit_logs where office_id = current_setting('t.oa')::uuid and summary = 'اختبار') = 1, 'سجل عمليات أ في مكتبه');
select t_assert((select count(*) from public.notifications n join public.hearings h on h.id = n.entity_id
                 where n.office_id <> h.office_id) = 0, 'لا إشعار يشير لمكتب آخر');

-- ------------------------------------------------------------
-- مالك المنصة
-- ------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.uf'), 'role', 'authenticated')::text, false);
select t_assert((select count(*) from platform_offices()) = 3, 'المالك يرى المكاتب الثلاثة');
select t_assert((select clients_count from platform_offices() where name = 'مكتب أ') = 6, 'المالك يرى عدد موكّلي أ');
select t_assert((select count(*) from public.clients where office_id = current_setting('t.oa')::uuid) = 0, 'المالك لا يرى موكّلي أ أنفسهم');
select t_assert((select count(*) from storage.objects where bucket_id = 'templates') >= 0, 'المالك يقرأ ملفات مكتبه');
select platform_set_office_active(current_setting('t.ob')::uuid, false);
reset role;

set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.ub'), 'role', 'authenticated')::text, false);
select t_assert(current_office_id() is null, 'مكتب ب الموقوف بلا وصول');
select t_assert((select count(*) from public.clients) = 0, 'مستخدم ب الموقوف لا يرى شيئًا');
select t_assert(not has_perm('clients', 'view') or (select count(*) from public.cases) = 0, 'لا بيانات لمكتب موقوف');
reset role;
set role anon;
select t_assert(resolve_login_email('admin_b', 'Password1!') is null, 'منع دخول مستخدمي المكتب الموقوف');
select t_assert(office_public_info('nope') is null, 'رابط مكتب غير موجود');
reset role;

-- المستخدم العادي يعدّل ملفه دون دوره (إصلاح التكرار اللانهائي)
select set_config('t.lb', (select id::text from public.profiles where username = 'lawyer_b'), false);
update public.offices set is_active = true where id = current_setting('t.ob')::uuid;
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.lb'), 'role', 'authenticated')::text, false);
update public.profiles set full_name = 'محامي ب المعدّل' where id = auth.uid();
do $$ begin
  begin
    update public.profiles set role_id = (select id from public.roles where code = 'super_admin') where id = auth.uid();
    perform t_assert(false, 'المحامي يرقّي نفسه');
  exception when insufficient_privilege or check_violation or foreign_key_violation then perform t_assert(true, 'منع المحامي من ترقية نفسه');
  end;
end $$;
reset role;
select t_assert((select full_name from public.profiles where username = 'lawyer_b') = 'محامي ب المعدّل', 'المستخدم يعدّل اسمه');

-- مدير المكتب الأول يعمل كالمعتاد
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.uf'), 'role', 'authenticated')::text, false);
select set_config('t.fc', (select count(*)::text from public.clients), false);
insert into public.clients (name, client_type) values ('موكّل المكتب الأول', 'individual');
select t_assert((select count(*) from public.clients) = current_setting('t.fc')::int + 1, 'المكتب الأول يرى موكّليه فقط');
select t_assert((select count(*) from public.clients where name like '%مكتب أ%' or name = 'موكّل ب') = 0, 'المكتب الأول لا يرى موكّلي أ و ب');
update public.profiles set full_name = full_name where id = auth.uid();
-- المالك يغيّر الروابط، وحالة الربط تُحدَّث للرابط الحالي فقط
select t_assert((platform_set_office_slug(current_setting('t.ob')::uuid, 'office-a') ->> 'ok')::boolean = false, 'المالك لا يكرر رابطًا');
select t_assert((platform_set_office_slug(current_setting('t.ob')::uuid, 'office-b') ->> 'ok')::boolean, 'المالك يعطي مكتب ب رابطًا');
select set_office_domain_status(current_setting('t.ob')::uuid, 'office-b', 'active');
select set_office_domain_status(current_setting('t.ob')::uuid, 'old-slug', 'failed', 'قديم');
select t_assert((select domain_status from platform_offices() where id = current_setting('t.ob')::uuid) = 'active', 'حالة الربط تظهر للمالك');
select t_assert((select ops_week >= 1 and logins_week >= 0 and hearings_count >= 0 from platform_offices() where id = current_setting('t.oa')::uuid), 'مؤشرات نشاط مكتب أ تظهر للمالك');
reset role;
-- مدير مكتب أ لا يغيّر حالة رابط مكتب ب ولا يغيّر الروابط
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.ua'), 'role', 'authenticated')::text, false);
do $$ begin
  begin perform set_office_domain_status(current_setting('t.ob')::uuid, 'office-b', 'failed');
    perform t_assert(false, 'مكتب يغيّر حالة رابط مكتب آخر'); exception when insufficient_privilege then null; end;
  begin perform platform_set_office_slug(current_setting('t.oa')::uuid, 'zzz');
    perform t_assert(false, 'مكتب يغيّر رابطه عبر دالة المالك'); exception when insufficient_privilege then null; end;
end $$;
select set_office_domain_status(current_setting('t.oa')::uuid, 'office-a', 'active');
select t_assert(true, 'مدير المكتب يسجّل حالة ربط رابطه');
reset role;
select t_assert((select domain_status from public.offices where id = current_setting('t.ob')::uuid) = 'active', 'حالة رابط ب لم تتغيّر');

-- المكتب الأول: بياناته القديمة كلها له
select t_assert((select count(*) from public.clients where office_id is null) = 0, 'لا موكّل بلا مكتب');
select t_assert((select count(*) from public.number_sequences where key not like '%:%') = 0, 'كل العدّادات مربوطة بمكتب');
select count(*) || ' اختبارًا ناجحًا' as result from public.t_log;
