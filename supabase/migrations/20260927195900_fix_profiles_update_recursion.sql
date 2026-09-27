-- ============================================================
-- إصلاح: تعديل أي ملف مستخدم كان يفشل بـ «infinite recursion
-- detected in policy for relation profiles»
-- ------------------------------------------------------------
-- شرط سياسة profiles_update كان يستعلم عن profiles نفسها
-- (select p2.role_id from profiles p2 …)، وPostgres يرفض ذلك عند
-- إعادة كتابة الاستعلام قبل التنفيذ — فتعطّل تعديل المستخدمين من
-- الإدارة، وتعديل الملف الشخصي، وتسجيل آخر دخول.
-- الحل: قراءة الحقول المحمية عبر دالة SECURITY DEFINER لا تمرّ بالسياسات.
-- ============================================================
create or replace function public.my_locked_profile()
returns table (role_id uuid, is_active boolean, username text)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select p.role_id, p.is_active, p.username
    from public.profiles p
   where p.id = auth.uid();
$$;

revoke all on function public.my_locked_profile() from public, anon;
grant execute on function public.my_locked_profile() to authenticated;

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.has_perm('users', 'update'))
  with check (
    public.has_perm('users', 'update')
    or (
      -- المستخدم يعدّل بياناته الشخصية دون المساس بدوره أو تفعيله أو اسمه
      id = (select auth.uid())
      and exists (
        select 1 from public.my_locked_profile() l
         where l.role_id   = profiles.role_id
           and l.is_active = profiles.is_active
           and l.username  = profiles.username
      )
    )
  );
