-- ============================================================
-- رابط موقع خاص لكل مكتب يُختار عند التسجيل
-- ------------------------------------------------------------
-- المكتب يكتب اسمًا إنجليزيًا (alquds) فيصبح موقعه alquds.masryps.com.
-- الخادم يطلب من Cloudflare ربط الرابط فور التسجيل، ويسجّل حالة
-- الربط هنا لتظهر في صفحة المالك (مع زر إعادة المحاولة).
-- ============================================================

alter table public.offices
  add column domain_status text not null default 'none'
    check (domain_status in ('none', 'pending', 'active', 'failed')),
  add column domain_error text;

update public.offices set domain_status = 'pending' where slug is not null;

comment on column public.offices.domain_status is
  'حالة ربط <slug>.masryps.com في Cloudflare: none بلا رابط، pending بانتظار الربط، active مربوط، failed فشل (السبب في domain_error).';

-- أسماء لا تُعطى لمكتب: عناوين برامج أخرى على masryps.com أو أسماء نظامية.
-- برنامج جديد على النطاق ⇒ أضِف اسمه هنا (Cloudflare يرفض الربط على أي حال
-- إن كان للاسم سجل DNS، فيظهر «فشل الربط» في صفحة المالك).
create or replace function public.office_slug_reserved(_slug text)
returns boolean
language sql
immutable
set search_path to 'pg_temp'
as $$
  select lower(btrim(_slug)) = any (array[
    'law', 'www', 'app', 'api', 'admin', 'mail', 'email', 'smtp', 'ftp', 'webmail', 'cpanel', 'ns1', 'ns2',
    'kamal', 'kamal-office', 'alaraj', 'alnoor', 'almayar', 'demo', 'insurance', 'thaqafi',
    'alnoor-insurance', 'hesasi', 'minutes', 'promo', 'system', 'jumla',
    'license', 'licenses', 'qobaj', 'portal', 'store', 'shop', 'wholesale',
    'test', 'staging', 'dev', 'static', 'cdn', 'assets', 'masry', 'masryps', 'masri',
    'login', 'register', 'platform', 'support', 'help', 'status', 'blog', 'docs'
  ]);
$$;

-- فحص فوري من صفحة التسجيل: صيغة الاسم، والحجز، وعدم تكراره
create or replace function public.office_slug_available(_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  _s text := lower(btrim(coalesce(_slug, '')));
begin
  if _s !~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$' or _s like '%--%' then
    return jsonb_build_object('ok', false, 'error', 'الرابط: أحرف إنجليزية صغيرة وأرقام وشرطة في الوسط، من 3 إلى 40 حرفًا.');
  end if;
  if public.office_slug_reserved(_s) then
    return jsonb_build_object('ok', false, 'error', 'هذا الاسم محجوز. اختر اسمًا آخر.');
  end if;
  if exists (select 1 from public.offices where slug = _s) then
    return jsonb_build_object('ok', false, 'error', 'هذا الرابط مستخدم لمكتب آخر. اختر اسمًا آخر.');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.office_slug_reserved(text) from public;
revoke all on function public.office_slug_available(text) from public;
grant execute on function public.office_slug_reserved(text) to anon, authenticated;
grant execute on function public.office_slug_available(text) to anon, authenticated;

-- التسجيل يأخذ الرابط (اختياري في القاعدة، مطلوب في الواجهة)
drop function if exists public.register_office(text, text, text, text, text, text);

create or replace function public.register_office(
  _office_name text,
  _full_name   text,
  _username    text,
  _email       text,
  _password    text,
  _phone       text,
  _slug        text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public', 'auth', 'extensions', 'pg_temp'
as $$
declare
  _office  uuid;
  _uid     uuid := gen_random_uuid();
  _role_id uuid;
  _ip      text;
  _email_n text := lower(btrim(coalesce(_email, '')));
  _user_n  text := btrim(coalesce(_username, ''));
  _phone_n text := regexp_replace(coalesce(_phone, ''), '[^0-9+]', '', 'g');
  _slug_n  text := nullif(lower(btrim(coalesce(_slug, ''))), '');
  _slug_ok jsonb;
begin
  begin
    _ip := coalesce(
      nullif(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1), ''),
      current_setting('request.headers', true)::json ->> 'cf-connecting-ip');
  exception when others then _ip := null;
  end;

  -- حدّ التسجيل: 3 مكاتب لكل عنوان في اليوم، و20 للنظام كله في الساعة
  if _ip is not null and (select count(*) from public.offices
                           where created_ip = _ip and created_at > now() - interval '1 day') >= 3 then
    return jsonb_build_object('ok', false, 'error', 'تجاوزت حدّ التسجيل اليومي. حاول غدًا أو تواصل معنا.');
  end if;
  if (select count(*) from public.offices where created_at > now() - interval '1 hour') >= 20 then
    return jsonb_build_object('ok', false, 'error', 'التسجيل مزدحم الآن. حاول بعد قليل.');
  end if;

  if length(btrim(coalesce(_office_name, ''))) < 2 then
    return jsonb_build_object('ok', false, 'error', 'اسم المكتب مطلوب.');
  end if;
  if length(btrim(coalesce(_full_name, ''))) < 2 then
    return jsonb_build_object('ok', false, 'error', 'اسم المدير مطلوب.');
  end if;
  if _user_n !~ '^[A-Za-z0-9._-]{3,40}$' then
    return jsonb_build_object('ok', false, 'error', 'اسم المستخدم: 3 أحرف إنجليزية أو أرقام على الأقل، بلا مسافات.');
  end if;
  if _email_n !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'error', 'البريد الإلكتروني غير صحيح.');
  end if;
  if _password is null or length(_password) < 8 then
    return jsonb_build_object('ok', false, 'error', 'كلمة المرور 8 أحرف على الأقل.');
  end if;
  if length(_phone_n) < 9 then
    return jsonb_build_object('ok', false, 'error', 'رقم الجوال غير صحيح.');
  end if;

  if _slug_n is not null then
    _slug_ok := public.office_slug_available(_slug_n);
    if not (_slug_ok ->> 'ok')::boolean then
      return jsonb_build_object('ok', false, 'error', _slug_ok ->> 'error', 'field', 'slug');
    end if;
  end if;

  if exists (select 1 from auth.users where lower(email) = _email_n) then
    return jsonb_build_object('ok', false, 'error', 'البريد الإلكتروني مسجَّل مسبقًا.');
  end if;
  if exists (select 1 from public.profiles where lower(username) = lower(_user_n)) then
    return jsonb_build_object('ok', false, 'error', 'اسم المستخدم محجوز. اختر اسمًا آخر.');
  end if;

  insert into public.offices (name, slug, domain_status, phone, email, created_ip)
  values (btrim(_office_name), _slug_n, case when _slug_n is null then 'none' else 'pending' end,
          _phone_n, _email_n, _ip)
  returning id into _office;

  perform public.seed_office(_office, btrim(_office_name), _phone_n);

  select id into _role_id from public.roles where office_id = _office and code = 'super_admin';
  if _role_id is null then
    raise exception 'دور المدير غير موجود في المكتب المصدر';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', _uid, 'authenticated', 'authenticated',
    _email_n, extensions.crypt(_password, extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', btrim(_full_name), 'username', _user_n),
    '', '', '', ''
  );

  insert into auth.identities (
    provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    _uid::text, _uid,
    jsonb_build_object('sub', _uid::text, 'email', _email_n, 'email_verified', true, 'phone_verified', false),
    'email', now(), now(), now()
  );

  insert into public.profiles (id, office_id, username, full_name, email, phone, role_id)
  values (_uid, _office, _user_n, btrim(_full_name), _email_n, _phone_n, _role_id);

  insert into public.audit_logs (office_id, user_id, user_name, action, entity, entity_id, entity_label, summary, ip_address)
  values (_office, _uid, btrim(_full_name), 'create', 'offices', _office::text, btrim(_office_name),
          'تسجيل مكتب جديد', _ip);

  return jsonb_build_object('ok', true, 'office_id', _office, 'username', _user_n, 'slug', _slug_n);
end;
$$;


revoke all on function public.register_office(text, text, text, text, text, text, text) from public;
grant execute on function public.register_office(text, text, text, text, text, text, text) to anon, authenticated;

-- المالك يغيّر الرابط: نفس الفحص، والحالة تعود «بانتظار الربط»
drop function if exists public.platform_set_office_slug(uuid, text);
create or replace function public.platform_set_office_slug(_office uuid, _slug text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  _new text := nullif(lower(btrim(coalesce(_slug, ''))), '');
  _old text;
  _chk jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'هذه العملية لمالك المنصة فقط' using errcode = '42501';
  end if;
  select slug into _old from public.offices where id = _office;
  if not found then
    raise exception 'المكتب غير موجود' using errcode = 'P0002';
  end if;
  if _new is not distinct from _old then
    return jsonb_build_object('ok', true, 'old', _old, 'new', _new);
  end if;
  if _new is not null then
    _chk := public.office_slug_available(_new);
    if not (_chk ->> 'ok')::boolean then
      return jsonb_build_object('ok', false, 'error', _chk ->> 'error');
    end if;
  end if;
  update public.offices
     set slug = _new,
         domain_status = case when _new is null then 'none' else 'pending' end,
         domain_error = null
   where id = _office;
  return jsonb_build_object('ok', true, 'old', _old, 'new', _new);
end;
$$;

revoke all on function public.platform_set_office_slug(uuid, text) from public, anon;
grant execute on function public.platform_set_office_slug(uuid, text) to authenticated;

-- الخادم يسجّل نتيجة الربط. يُسمح لمالك المنصة، ولمدير المكتب على
-- مكتبه فقط (مباشرة بعد تسجيله). الأسوأ أن يغيّر مكتبٌ حالة عرضٍ لرابطه هو.
create or replace function public.set_office_domain_status(_office uuid, _slug text, _status text, _error text default null)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if _status not in ('pending', 'active', 'failed') then
    raise exception 'حالة غير صحيحة' using errcode = '22023';
  end if;
  if not (public.is_platform_admin() or _office = public.current_office_id()) then
    raise exception 'غير مسموح' using errcode = '42501';
  end if;
  -- الشرط على الرابط يمنع نتيجة قديمة من الكتابة فوق رابط تغيّر بعدها
  update public.offices
     set domain_status = _status, domain_error = left(_error, 500)
   where id = _office and slug = lower(btrim(_slug));
end;
$$;

revoke all on function public.set_office_domain_status(uuid, text, text, text) from public, anon;
grant execute on function public.set_office_domain_status(uuid, text, text, text) to authenticated;

-- صفحة المالك تعرض حالة الربط
drop function if exists public.platform_offices();
create or replace function public.platform_offices()
returns table (
  id uuid, name text, slug text, phone text, email text, is_active boolean, is_founding boolean,
  created_at timestamptz, users_count bigint, clients_count bigint, cases_count bigint,
  last_activity timestamptz, license_state text, license_checked_at timestamptz, admin_username text,
  domain_status text, domain_error text
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'هذه الصفحة لمالك المنصة فقط' using errcode = '42501';
  end if;

  -- أعداد فقط — لا تُكشف أي بيانات موكّلين أو قضايا للمالك
  return query
  select o.id, o.name, o.slug, o.phone, o.email, o.is_active, o.is_founding, o.created_at,
         (select count(*) from public.profiles p where p.office_id = o.id and p.deleted_at is null),
         (select count(*) from public.clients c where c.office_id = o.id and c.deleted_at is null),
         (select count(*) from public.cases cs where cs.office_id = o.id and cs.deleted_at is null),
         (select max(a.created_at) from public.audit_logs a where a.office_id = o.id),
         ls.last_state, ls.last_verified_at,
         (select p.username from public.profiles p join public.roles r on r.id = p.role_id
           where p.office_id = o.id and r.code = 'super_admin' and p.deleted_at is null
           order by p.created_at limit 1),
         o.domain_status, o.domain_error
    from public.offices o
    left join public.license_state ls on ls.office_id = o.id
   order by o.is_founding desc, o.created_at desc;
end;
$$;

revoke all on function public.platform_offices() from public, anon;
grant execute on function public.platform_offices() to authenticated;
