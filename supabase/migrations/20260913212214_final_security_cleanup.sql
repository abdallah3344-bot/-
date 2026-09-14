-- ============================================================
-- تنظيف أمني نهائي
-- ============================================================

-- 1) حذف النسخة القديمة من مولّد التنبيهات (بلا وسيط) لتفادي الالتباس
--    بين تحميلين للدالة نفسها.
drop function if exists public.generate_notifications();

-- 2) أدوات التطوير لا يجوز أن تبقى مفتوحة لكل مستخدم مسجّل.
--    export_migrations لم تعد لازمة: ملفات الهجرة محفوظة في المستودع.
drop function if exists public.export_migrations();

--    introspect_schema يحتاجها مولّد الأنواع فقط، فتُقصر على مدير النظام.
create or replace function public.introspect_schema()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_super_admin() then
    raise exception 'هذه الدالة لأدوات التطوير ومقصورة على مدير النظام'
      using errcode = '42501';
  end if;

  return (
    select jsonb_build_object(
      'tables', (
        select jsonb_agg(t order by t.table_name)
        from (
          select
            c.relname as table_name,
            (select jsonb_agg(jsonb_build_object(
               'name', a.attname,
               'type', format_type(a.atttypid, a.atttypmod),
               'nullable', not a.attnotnull,
               'has_default', a.atthasdef or a.attidentity <> '',
               'generated', a.attidentity <> '',
               'comment', col_description(c.oid, a.attnum)
             ) order by a.attnum)
             from pg_attribute a
             where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
            ) as columns,
            coalesce((
              select jsonb_agg(jsonb_build_object(
                'constraint_name', con.conname,
                'columns', (select jsonb_agg(att.attname order by u.ord)
                            from unnest(con.conkey) with ordinality as u(attnum, ord)
                            join pg_attribute att on att.attrelid = con.conrelid and att.attnum = u.attnum),
                'ref_table', ref.relname,
                'ref_columns', (select jsonb_agg(att.attname order by u.ord)
                                from unnest(con.confkey) with ordinality as u(attnum, ord)
                                join pg_attribute att on att.attrelid = con.confrelid and att.attnum = u.attnum),
                'is_one_to_one', exists (
                  select 1 from pg_constraint uq
                  where uq.conrelid = con.conrelid and uq.contype in ('u','p')
                    and uq.conkey @> con.conkey and con.conkey @> uq.conkey
                )
              ))
              from pg_constraint con
              join pg_class ref on ref.oid = con.confrelid
              where con.conrelid = c.oid and con.contype = 'f'
            ), '[]'::jsonb) as foreign_keys
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relkind = 'r'
        ) t
      ),
      'functions', (
        select jsonb_agg(f order by f.function_name)
        from (
          select p.proname as function_name,
                 pg_get_function_arguments(p.oid) as args,
                 pg_get_function_result(p.oid) as returns
          from pg_proc p
          join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.prokind = 'f'
            and has_function_privilege('authenticated', p.oid, 'EXECUTE')
        ) f
      )
    )
  );
end;
$$;

revoke all on function public.introspect_schema() from public, anon;
grant execute on function public.introspect_schema() to authenticated;

-- 3) مولّد الأرقام التسلسلية داخلي بحت: يُستدعى من محفّزات فقط
revoke execute on function public.next_sequence_number(text, text)
  from public, anon, authenticated;

-- 4) توثيق ما هو مقصود
comment on function public.resolve_login_email(text, text) is
  'مقصود أن تكون متاحة لغير المسجّلين: لازمة لتسجيل الدخول باسم المستخدم. '
  'لا تكشف البريد إلا بعد التحقق من كلمة المرور، فلا تُمكّن من تعداد الحسابات.';

comment on function public.soft_delete(text, uuid) is
  'حذف ناعم. SECURITY DEFINER عمدًا، لكنها تتحقق من صلاحية الحذف للوحدة المعنية قبل أي كتابة.';

comment on function public.create_office_user(text,text,text,text,text,text,text) is
  'إنشاء مستخدم. SECURITY DEFINER للكتابة في auth.users، وتتحقق من users.create قبل أي شيء.';

comment on table public.notifications is
  'تنبيهات المستخدمين. كل مستخدم يرى تنبيهاته فقط عبر RLS.';
;
