-- ============================================================
-- تقوية أمنية بناءً على نتائج فاحص Supabase
-- ============================================================

-- 1) تثبيت search_path على دالة التريغر
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2) نقل pg_trgm خارج المخطط public
drop index if exists public.profiles_name_trgm_idx;
drop index if exists public.clients_name_trgm;
drop index if exists public.cases_title_trgm;
drop index if exists public.documents_name_trgm;
drop index if exists public.contracts_title_trgm;
drop index if exists public.correspondence_subject_trgm;

drop extension if exists pg_trgm;
create extension if not exists pg_trgm with schema extensions;

create index profiles_name_trgm_idx      on public.profiles       using gin (full_name  extensions.gin_trgm_ops);
create index clients_name_trgm           on public.clients        using gin (name       extensions.gin_trgm_ops);
create index cases_title_trgm            on public.cases          using gin (title      extensions.gin_trgm_ops);
create index documents_name_trgm         on public.documents      using gin (name       extensions.gin_trgm_ops);
create index contracts_title_trgm        on public.contracts      using gin (title      extensions.gin_trgm_ops);
create index correspondence_subject_trgm on public.correspondence using gin (subject    extensions.gin_trgm_ops);

-- 3) منع الدور المجهول (anon) من تنفيذ أي دالة داخلية
revoke execute on function public.can_access_case(uuid)            from anon, public;
revoke execute on function public.can_access_client(uuid)          from anon, public;
revoke execute on function public.current_role_code()              from anon, public;
revoke execute on function public.has_perm(text, text)             from anon, public;
revoke execute on function public.is_lawyer_scoped()               from anon, public;
revoke execute on function public.is_super_admin()                 from anon, public;
revoke execute on function public.my_permissions()                 from anon, public;
revoke execute on function public.mark_overdue_tasks()             from anon, public;
revoke execute on function public.next_sequence_number(text, text) from anon, public;
revoke execute on function public.write_audit_log(text,text,text,text,text,jsonb,text,text) from anon, public;

-- دوال التريغر لا يجوز استدعاؤها عبر REST إطلاقًا
revoke execute on function public.set_updated_at()                       from anon, authenticated, public;
revoke execute on function public.log_case_status_change()               from anon, authenticated, public;
revoke execute on function public.recalc_invoice_paid()                  from anon, authenticated, public;
revoke execute on function public.recalc_invoice_totals()                from anon, authenticated, public;
revoke execute on function public.create_default_notification_settings() from anon, authenticated, public;

-- إعادة المنح للمستخدمين المسجّلين فقط
grant execute on function public.can_access_case(uuid)   to authenticated;
grant execute on function public.can_access_client(uuid) to authenticated;
grant execute on function public.current_role_code()     to authenticated;
grant execute on function public.has_perm(text, text)    to authenticated;
grant execute on function public.is_lawyer_scoped()      to authenticated;
grant execute on function public.is_super_admin()        to authenticated;
grant execute on function public.my_permissions()        to authenticated;
grant execute on function public.mark_overdue_tasks()    to authenticated;
grant execute on function public.write_audit_log(text,text,text,text,text,jsonb,text,text) to authenticated;

-- next_sequence_number: تُستدعى داخليًا فقط من دوال أخرى SECURITY DEFINER
-- ولا تُمنح لأي دور عبر REST.

-- 4) إغلاق ثغرة تعداد الحسابات في resolve_login_email
--    النسخة القديمة كانت تُرجع البريد مقابل اسم المستخدم لأي زائر.
--    النسخة الجديدة لا تُرجع البريد إلا بعد التحقق من كلمة المرور نفسها.
drop function if exists public.resolve_login_email(text);

create or replace function public.resolve_login_email(identifier text, password text)
returns text
language plpgsql
stable
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  _email text;
  _hash  text;
begin
  if identifier is null or password is null then
    return null;
  end if;

  -- يقبل اسم المستخدم أو البريد الإلكتروني
  select p.email into _email
    from public.profiles p
   where (lower(p.username) = lower(btrim(identifier))
          or lower(p.email) = lower(btrim(identifier)))
     and p.is_active
     and p.deleted_at is null
   limit 1;

  if _email is null then
    return null;
  end if;

  select u.encrypted_password into _hash
    from auth.users u
   where lower(u.email) = lower(_email)
   limit 1;

  -- لا يُكشف البريد إلا إذا كانت كلمة المرور صحيحة
  if _hash is null or _hash <> extensions.crypt(password, _hash) then
    return null;
  end if;

  return _email;
end;
$$;

revoke all on function public.resolve_login_email(text, text) from public;
grant execute on function public.resolve_login_email(text, text) to anon, authenticated;

comment on function public.resolve_login_email(text, text) is
  'يحوّل اسم المستخدم إلى بريد لتسجيل الدخول. لا يُرجع البريد إلا بعد التحقق من كلمة المرور، منعًا لتعداد الحسابات.';

comment on table public.number_sequences is
  'عدّادات الأرقام التسلسلية. RLS مفعّل بلا سياسات عمدًا: لا وصول مباشر إطلاقًا، والوصول الوحيد عبر next_sequence_number().';
;