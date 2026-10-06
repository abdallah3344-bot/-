-- ============================================================
-- الترخيص على المستخدمين لا الأجهزة
-- ------------------------------------------------------------
-- المكتب يدخل من أي جهاز ومتصفح. الحد هو عدد المستخدمين الفعّالين،
-- ويُقرأ من لوحة التراخيص مباشرة (max_devices هناك = حد المستخدمين
-- لبرنامج المحاماة)، فلا يستطيع المكتب رفعه بالكتابة في قاعدته.
-- وكل مستخدم يبقى مفتوحًا على جهازين على الأكثر في الوقت نفسه.
-- ============================================================

create extension if not exists http with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.license_api (
  id       boolean primary key default true check (id),
  url      text not null,
  anon_key text not null
);

-- مفتاح anon للوحة التراخيص علني أصلًا (مضمّن في البرامج المكتبية)
insert into private.license_api (url, anon_key) values (
  'https://mnpxzjmljnzrekjffimc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ucHh6am1sam56cmVramZmaW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMTEyNjgsImV4cCI6MjA5OTg4NzI2OH0.4f8Xr4NM_EwGoJmyE4YRhN8bbgH6zAVF4TuqTDeyFZw'
) on conflict (id) do update set url = excluded.url, anon_key = excluded.anon_key;

/** حد المستخدمين لمكتب من لوحة التراخيص. null = غير معروف (لا ترخيص بعد أو تعذّر الاتصال). */
create or replace function public.office_user_limit(p_office uuid)
returns integer
language plpgsql
volatile
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $$
declare
  _api  private.license_api%rowtype;
  _ls   public.license_state%rowtype;
  _resp extensions.http_response;
  _body jsonb;
begin
  select * into _api from private.license_api limit 1;
  select * into _ls from public.license_state where office_id = p_office;
  if _api.url is null or _ls.office_id is null then return null; end if;

  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '4000');
  _resp := extensions.http((
    'POST', _api.url || '/rest/v1/rpc/client_license_overview',
    array[extensions.http_header('apikey', _api.anon_key),
          extensions.http_header('Authorization', 'Bearer ' || _api.anon_key)],
    'application/json',
    jsonb_build_object('p_program', 'law-office',
      'p_refs', jsonb_build_array(jsonb_build_object('ref', p_office, 'key', _ls.license_key, 'device', _ls.device_id)))::text
  )::extensions.http_request);

  if _resp.status <> 200 then return null; end if;
  _body := _resp.content::jsonb;
  if jsonb_typeof(_body) <> 'array' or jsonb_array_length(_body) = 0 then return null; end if;
  return nullif((_body->0->>'max_devices')::int, 0);
exception when others then
  -- انقطاع الاتصال لا يعطّل إضافة المستخدمين
  return null;
end;
$$;

revoke all on function public.office_user_limit(uuid) from public, anon, authenticated;

/** عدد المستخدمين الفعّالين وحدّهم لمكتب المستخدم الحالي — لبطاقة الترخيص. */
create or replace function public.my_office_user_usage()
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  _office uuid := public.current_office_id();
begin
  if _office is null then return null; end if;
  return jsonb_build_object(
    'used', (select count(*) from public.profiles where office_id = _office and is_active and deleted_at is null),
    'max', public.office_user_limit(_office)
  );
end;
$$;

revoke all on function public.my_office_user_usage() from public, anon;
grant execute on function public.my_office_user_usage() to authenticated;

/** يمنع تجاوز حد المستخدمين عند الإضافة أو إعادة التفعيل أو الاسترجاع. */
create or replace function public.enforce_office_user_limit()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  _limit integer;
  _used  integer;
begin
  if new.office_id is null or not coalesce(new.is_active, true) or new.deleted_at is not null then
    return new;
  end if;
  if tg_op = 'UPDATE' and coalesce(old.is_active, true) and old.deleted_at is null then
    return new;  -- كان فعّالًا أصلًا
  end if;

  _limit := public.office_user_limit(new.office_id);
  if _limit is null then return new; end if;

  select count(*) into _used from public.profiles
   where office_id = new.office_id and is_active and deleted_at is null and id <> new.id;
  if _used >= _limit then
    raise exception 'وصل المكتب إلى الحد الأقصى للمستخدمين في الترخيص (%). لزيادة العدد تواصل مع مكتب البرمجيات.', _limit
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create or replace trigger trg_enforce_office_user_limit
  before insert or update of is_active, deleted_at on public.profiles
  for each row execute function public.enforce_office_user_limit();

/** يُبقي آخر جلستين للمستخدم ويغلق الأقدم — يُستدعى بعد كل دخول. */
create or replace function public.trim_my_sessions(p_keep integer default 2)
returns integer
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
declare
  _n integer;
begin
  if auth.uid() is null then return 0; end if;
  with stale as (
    select id from auth.sessions where user_id = auth.uid()
     order by coalesce(updated_at, created_at) desc
     offset greatest(p_keep, 1)
  )
  delete from auth.sessions s using stale where s.id = stale.id;
  get diagnostics _n = row_count;
  return _n;
end;
$$;

revoke all on function public.trim_my_sessions(integer) from public, anon;
grant execute on function public.trim_my_sessions(integer) to authenticated;
