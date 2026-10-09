-- ============================================================
-- اطمئنان العميل: أجهزة الحساب + سياسة الخصوصية
-- ------------------------------------------------------------
-- 1) كل مستخدم يرى جلساته المفتوحة (الجهاز، آخر نشاط) ويُخرج أيًّا منها،
--    أو كلها عدا جهازه الحالي، ويرى سجل دخوله الأخير.
-- 2) موافقة المكتب على سياسة الخصوصية وشروط الاستخدام تُحفظ بتاريخها
--    وإصدارها ومن وافق.
-- ============================================================

alter table public.offices
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version     text,
  add column if not exists terms_accepted_by uuid;

/** موافقة مدير المكتب على سياسة الخصوصية — لمكتبه فقط. */
create or replace function public.accept_office_terms(p_version text)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  _office uuid := public.current_office_id();
begin
  if _office is null or not public.has_perm('settings', 'update') then
    raise exception 'الموافقة على السياسة لمدير المكتب' using errcode = '42501';
  end if;
  if p_version is null or length(trim(p_version)) = 0 or length(p_version) > 20 then
    raise exception 'إصدار غير صالح' using errcode = '22023';
  end if;
  update public.offices
     set terms_accepted_at = now(), terms_version = trim(p_version), terms_accepted_by = auth.uid()
   where id = _office and terms_version is distinct from trim(p_version);
  return true;
end;
$$;

revoke all on function public.accept_office_terms(text) from public, anon;
grant execute on function public.accept_office_terms(text) to authenticated;

/** هل وافق المكتب الحالي على إصدار السياسة المطلوب؟ */
create or replace function public.office_terms_status()
returns jsonb
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select jsonb_build_object('version', terms_version, 'accepted_at', terms_accepted_at)
    from public.offices where id = public.current_office_id();
$$;

revoke all on function public.office_terms_status() from public, anon;
grant execute on function public.office_terms_status() to authenticated;

/** جلسات المستخدم المفتوحة، الأحدث نشاطًا أولًا. */
create or replace function public.my_sessions()
returns table (id uuid, created_at timestamptz, last_active timestamptz, user_agent text, ip text, is_current boolean)
language sql
stable
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
  select s.id, s.created_at,
         greatest(s.created_at, s.updated_at, (s.refreshed_at at time zone 'UTC')) as last_active,
         s.user_agent, host(s.ip),
         s.id = nullif(auth.jwt() ->> 'session_id', '')::uuid
    from auth.sessions s
   where s.user_id = auth.uid()
   order by s.id = nullif(auth.jwt() ->> 'session_id', '')::uuid desc, 3 desc;
$$;

revoke all on function public.my_sessions() from public, anon;
grant execute on function public.my_sessions() to authenticated;

/** إخراج جلسة واحدة (أو كل الجلسات الأخرى حين p_id فارغ) — لا يمس الجلسة الحالية. */
create or replace function public.end_my_sessions(p_id uuid default null)
returns integer
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
declare
  _current uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  _n integer;
begin
  if auth.uid() is null then return 0; end if;
  delete from auth.sessions s
   where s.user_id = auth.uid()
     and s.id is distinct from _current
     and (p_id is null or s.id = p_id);
  get diagnostics _n = row_count;
  return _n;
end;
$$;

revoke all on function public.end_my_sessions(uuid) from public, anon;
grant execute on function public.end_my_sessions(uuid) to authenticated;

/** آخر عمليات دخول المستخدم نفسه. */
create or replace function public.my_login_history(p_limit integer default 10)
returns table (created_at timestamptz, user_agent text, ip text)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select a.created_at, a.user_agent, a.ip_address::text
    from public.audit_logs a
   where a.user_id = auth.uid() and a.action = 'login'
   order by a.created_at desc
   limit least(greatest(coalesce(p_limit, 10), 1), 30);
$$;

revoke all on function public.my_login_history(integer) from public, anon;
grant execute on function public.my_login_history(integer) to authenticated;
