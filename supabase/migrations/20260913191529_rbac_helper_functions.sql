-- ============================================================
-- دوال الصلاحيات — SECURITY DEFINER لتتجاوز RLS عند حساب الصلاحية نفسها
-- search_path مثبّت لمنع اختطاف المسار
-- ============================================================

-- كود دور المستخدم الحالي
create or replace function public.current_role_code()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select r.code
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where p.id = auth.uid()
    and p.is_active
    and p.deleted_at is null;
$$;

-- هل المستخدم مدير نظام؟
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.current_role_code() = 'super_admin', false);
$$;

-- هل بيانات المستخدم محصورة بالقضايا المسندة إليه؟ (المحامي فقط)
create or replace function public.is_lawyer_scoped()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.current_role_code() = 'lawyer', false);
$$;

-- كل الصلاحيات الفعّالة للمستخدم الحالي
--   = صلاحيات الدور  ∪  المنوحة فرديًا  −  المرفوضة فرديًا
create or replace function public.my_permissions()
returns table (code text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with me as (
    select p.id, p.role_id
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active
      and p.deleted_at is null
  ),
  from_role as (
    select perm.id, perm.code
    from me
    join public.role_permissions rp on rp.role_id = me.role_id
    join public.permissions perm on perm.id = rp.permission_id
  ),
  granted as (
    select perm.id, perm.code
    from me
    join public.user_permissions up on up.user_id = me.id and up.granted
    join public.permissions perm on perm.id = up.permission_id
  ),
  revoked as (
    select up.permission_id
    from me
    join public.user_permissions up on up.user_id = me.id and up.granted = false
  )
  select u.code
  from (
    select * from from_role
    union
    select * from granted
  ) u
  where u.id not in (select permission_id from revoked);
$$;

-- فحص صلاحية واحدة
create or replace function public.has_perm(_module text, _action text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.my_permissions() mp
    where mp.code = _module || '.' || _action
  );
$$;

-- تحويل اسم المستخدم إلى بريد لتسجيل الدخول
-- لا تكشف أي بيانات أخرى، وتُرجع null بصمت عند عدم الوجود
create or replace function public.resolve_login_email(identifier text)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.email
  from public.profiles p
  where lower(p.username) = lower(btrim(identifier))
    and p.is_active
    and p.deleted_at is null
  limit 1;
$$;

revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;
grant execute on function public.my_permissions() to authenticated;
grant execute on function public.has_perm(text, text) to authenticated;
grant execute on function public.current_role_code() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_lawyer_scoped() to authenticated;
;