-- ============================================================
-- تعدد المكاتب (1/3): جدول المكاتب وربط كل بيانات الأعمال بمكتبها
-- ------------------------------------------------------------
-- القاعدة: كل صف أعمال يحمل office_id. العزل يُفرض بثلاث طبقات
-- داخل القاعدة نفسها، فلا يعتمد على صحة كود التطبيق:
--   1. سياسة RESTRICTIVE على كل جدول: لا يُقرأ ولا يُكتب صف خارج
--      مكتب المستخدم، مهما سمحت السياسات الأخرى. تُضاف إلى السياسات
--      القائمة (AND) ولا تستبدلها، فالصلاحيات داخل المكتب كما هي.
--   2. مشغّل على كل جدول: لا يمكن لصف في مكتب أن يشير إلى صف في
--      مكتب آخر (قضية إلى موكّل، دفعة إلى فاتورة…).
--   3. دوال SECURITY DEFINER (تتجاوز RLS) عُدّلت كلها لتقيّد نفسها
--      بمكتب المستدعي — الترحيل الثاني.
-- البيانات الحالية كلها تصبح «المكتب الأول» (is_founding).
-- ============================================================

-- ------------------------------------------------------------
-- المكاتب
-- ------------------------------------------------------------
create table public.offices (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) between 2 and 120),
  -- الاسم في الرابط الفرعي: <slug>.masryps.com — اختياري
  slug        text unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  phone       text,
  email       text,
  is_active   boolean not null default true,
  is_founding boolean not null default false,
  created_at  timestamptz not null default now(),
  created_ip  text,
  notes       text
);

comment on table public.offices is
  'مكاتب المحاماة المشتركة في النظام. كل بيانات الأعمال مربوطة بمكتب.';
comment on column public.offices.is_active is
  'إيقاف المكتب يمنع دخول كل مستخدميه فورًا (current_office_id ترجع null).';

create unique index offices_single_founding on public.offices (is_founding) where is_founding;

insert into public.offices (name, is_founding)
select coalesce((select office_name from public.settings limit 1), 'المكتب الأول'), true;

-- مالكو المنصة: يرون كل المكاتب في صفحة المالك ولا يرون بياناتها
create table public.platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.offices         enable row level security;
alter table public.platform_admins enable row level security;
revoke all on public.offices, public.platform_admins from anon;

-- ------------------------------------------------------------
-- مكتب المستخدم الحالي
-- ------------------------------------------------------------
-- SECURITY DEFINER لتقرأ profiles دون أن تمرّ بسياساتها (التي تناديها)،
-- فلا تكرار لا نهائي. ترجع null لمستخدم غير مسجَّل أو مكتبه موقوف ⇒
-- كل السياسات المقيِّدة تُغلق.
create or replace function public.current_office_id()
returns uuid
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  return (select p.office_id
            from public.profiles p
            join public.offices o on o.id = p.office_id and o.is_active
           where p.id = auth.uid());
end;
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

-- ------------------------------------------------------------
-- العمود office_id على كل جداول الأعمال
-- ------------------------------------------------------------
do $$
declare
  _founding uuid := (select id from public.offices where is_founding);
  _t text;
  _tables text[] := array[
    'profiles','roles','role_permissions','user_permissions','settings','audit_logs',
    'case_types','courts','court_chambers','judges','document_categories','expense_categories',
    'clients','cases','opponents','case_notes','case_status_history',
    'hearings','tasks','appointments',
    'documents','document_templates','powers_of_attorney','contracts',
    'case_fees','fee_installments','invoices','invoice_items','payments','expenses',
    'accounts','transactions',
    'correspondence','notifications','notification_settings','license_state'
  ];
begin
  -- التأكد أن القائمة تغطي كل جداول public عدا الجداول المشتركة عمدًا
  if exists (
    select 1 from information_schema.tables
     where table_schema = 'public' and table_type = 'BASE TABLE'
       and table_name <> all (_tables || array['permissions','login_attempts','number_sequences','offices','platform_admins'])
  ) then
    raise exception 'جدول أعمال غير مصنَّف: %', (
      select string_agg(table_name, ', ') from information_schema.tables
       where table_schema = 'public' and table_type = 'BASE TABLE'
         and table_name <> all (_tables || array['permissions','login_attempts','number_sequences','offices','platform_admins']));
  end if;

  foreach _t in array _tables loop
    execute format('alter table public.%I add column office_id uuid', _t);
    execute format('update public.%I set office_id = $1', _t) using _founding;
    -- سجل العمليات وحده يقبل null: قد يُكتب قبل تسجيل الدخول
    if _t <> 'audit_logs' then
      execute format('alter table public.%I alter column office_id set not null', _t);
    end if;
    execute format('alter table public.%I alter column office_id set default public.current_office_id()', _t);
    execute format('alter table public.%I add constraint %I foreign key (office_id) references public.offices(id) on delete cascade',
                   _t, _t || '_office_fk');
    execute format('create index %I on public.%I (office_id)', _t || '_office_idx', _t);

    -- الطبقة الأولى: سياسة مقيِّدة
    execute format($p$
      create policy office_isolation on public.%I
        as restrictive
        for all
        to public
        using (office_id = (select public.current_office_id()))
        with check (office_id = (select public.current_office_id()))
    $p$, _t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- الطبقة الثانية: لا صف يشير إلى صف في مكتب آخر
-- ------------------------------------------------------------
-- المفاتيح الأجنبية الأصلية تبقى كما هي (عليها يعتمد الربط التلقائي
-- في واجهة البيانات مثل clients:client_id(name))، ويُضاف مشغّل على
-- كل جدول يتحقق أن كل معرّف مُشار إليه من مكتب الصف نفسه.
-- SECURITY DEFINER ليرى الصف المُشار إليه مهما كانت صلاحيات المستخدم.
create or replace function public.enforce_same_office()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  _pair text;
  _col  text;
  _tbl  text;
  _ref  uuid;
  _ok   boolean;
begin
  foreach _pair in array tg_argv loop
    _col := split_part(_pair, ':', 1);
    _tbl := split_part(_pair, ':', 2);
    execute format('select ($1).%I::uuid', _col) into _ref using new;
    if _ref is not null then
      execute format('select exists (select 1 from public.%I where id = $1 and office_id = $2)', _tbl)
        into _ok using _ref, new.office_id;
      if not _ok then
        raise exception 'المرجع %.% لا ينتمي لهذا المكتب', tg_table_name, _col
          using errcode = '23503';
      end if;
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function public.enforce_same_office() from public, anon, authenticated;

do $$
declare
  _r record;
begin
  for _r in
    select c.conrelid::regclass::text as child,
           array_agg(a.attname || ':' || c.confrelid::regclass::text order by a.attname) as pairs
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
     where c.contype = 'f'
       and c.connamespace = 'public'::regnamespace
       and c.confrelid::regclass::text not in ('permissions', 'offices', 'auth.users')
     group by c.conrelid
  loop
    execute format(
      'create trigger zz_enforce_same_office before insert or update on public.%I
         for each row execute function public.enforce_same_office(%s)',
      _r.child,
      (select string_agg(quote_literal(p), ', ') from unnest(_r.pairs) p));
  end loop;
end $$;

-- ------------------------------------------------------------
-- القيود الفريدة تصبح داخل المكتب
-- ------------------------------------------------------------
alter table public.cases              drop constraint cases_internal_no_key,          add constraint cases_internal_no_key          unique (office_id, internal_no);
alter table public.clients            drop constraint clients_client_no_key,          add constraint clients_client_no_key          unique (office_id, client_no);
alter table public.contracts          drop constraint contracts_contract_no_key,      add constraint contracts_contract_no_key      unique (office_id, contract_no);
alter table public.correspondence     drop constraint correspondence_reference_no_key, add constraint correspondence_reference_no_key unique (office_id, reference_no);
alter table public.invoices           drop constraint invoices_invoice_no_key,        add constraint invoices_invoice_no_key        unique (office_id, invoice_no);
alter table public.payments           drop constraint payments_receipt_no_key,        add constraint payments_receipt_no_key        unique (office_id, receipt_no);
alter table public.powers_of_attorney drop constraint powers_of_attorney_poa_no_key,  add constraint powers_of_attorney_poa_no_key  unique (office_id, poa_no);
alter table public.roles              drop constraint roles_code_key,                 add constraint roles_code_key                 unique (office_id, code);
alter table public.case_types         drop constraint case_types_name_ar_key,         add constraint case_types_name_ar_key         unique (office_id, name_ar);
alter table public.document_categories drop constraint document_categories_name_ar_key, add constraint document_categories_name_ar_key unique (office_id, name_ar);
alter table public.expense_categories drop constraint expense_categories_name_ar_key, add constraint expense_categories_name_ar_key unique (office_id, name_ar);
alter table public.courts             drop constraint courts_name_governorate_unique, add constraint courts_name_governorate_unique unique (office_id, name_ar, governorate);

-- الإعدادات والترخيص: صف لكل مكتب بدل صف واحد للنظام.
-- العمود id يبقى (دائمًا true) حتى لا ينكسر كود يصفّي به.
alter table public.settings      drop constraint settings_pkey,      add primary key (office_id);
alter table public.license_state drop constraint license_state_pkey, add primary key (office_id);

-- العدّادات التسلسلية: المفتاح يبدأ بمعرّف المكتب
update public.number_sequences
   set key = (select id from public.offices where is_founding)::text || ':' || key;

-- ------------------------------------------------------------
-- سياسات المكاتب
-- ------------------------------------------------------------
create policy offices_select on public.offices
  for select to authenticated
  using (id = (select public.current_office_id()) or (select public.is_platform_admin()));

create policy platform_admins_select on public.platform_admins
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.offices, public.platform_admins to authenticated;

-- مالك المنصة: مدير النظام في المكتب الأول
insert into public.platform_admins (user_id)
select p.id
  from public.profiles p
  join public.roles r on r.id = p.role_id
 where r.code = 'super_admin' and p.username = 'admin'
on conflict do nothing;

revoke all on function public.current_office_id() from public;
grant execute on function public.current_office_id() to anon, authenticated;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;
