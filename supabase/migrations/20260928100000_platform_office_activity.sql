-- ============================================================
-- صفحة المالك: مؤشرات نشاط لكل مكتب (أعداد فقط، بلا أي محتوى)
-- ------------------------------------------------------------
-- العمليات = إدخال/تعديل/حذف/رفع/اعتماد… من سجل العمليات (لا يدخل
-- فيها الدخول والخروج والطباعة). الدخول يُعدّ وحده.
-- ============================================================

create index if not exists audit_logs_office_created_idx
  on public.audit_logs (office_id, created_at desc);

drop function if exists public.platform_offices();
create or replace function public.platform_offices()
returns table (
  id uuid, name text, slug text, phone text, email text, is_active boolean, is_founding boolean,
  created_at timestamptz, users_count bigint, clients_count bigint, cases_count bigint,
  last_activity timestamptz, license_state text, license_checked_at timestamptz, admin_username text,
  domain_status text, domain_error text,
  hearings_count bigint, invoices_count bigint,
  ops_today bigint, ops_week bigint, logins_week bigint
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  -- «اليوم» بتوقيت فلسطين
  _today timestamptz := date_trunc('day', now() at time zone 'Asia/Hebron') at time zone 'Asia/Hebron';
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
         o.domain_status, o.domain_error,
         (select count(*) from public.hearings h where h.office_id = o.id and h.deleted_at is null),
         (select count(*) from public.invoices i where i.office_id = o.id and i.deleted_at is null),
         act.ops_today, act.ops_week, act.logins_week
    from public.offices o
    left join public.license_state ls on ls.office_id = o.id
    cross join lateral (
      select count(*) filter (where a.created_at >= _today and a.action not in ('login', 'logout', 'login_failed', 'print', 'download', 'export')) as ops_today,
             count(*) filter (where a.action not in ('login', 'logout', 'login_failed', 'print', 'download', 'export')) as ops_week,
             count(*) filter (where a.action = 'login') as logins_week
        from public.audit_logs a
       where a.office_id = o.id and a.created_at >= now() - interval '7 days'
    ) act
   order by o.is_founding desc, o.created_at desc;
end;
$$;

revoke all on function public.platform_offices() from public, anon;
grant execute on function public.platform_offices() to authenticated;
