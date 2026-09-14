-- ============================================================
-- أداة إبقاء supabase/migrations/ متطابقًا مع القاعدة.
-- ------------------------------------------------------------
-- الحاجة ظهرت بعد انحراف فعلي: ترحيلات طُبّقت على القاعدة ولم
-- تُصدَّر للمستودع، فصار بناء القاعدة من الصفر ناقصًا.
-- مقصورة على مدير النظام: محتوى الترحيلات يكشف بنية الأمان كاملة.
-- ============================================================

create or replace function public.export_migrations()
returns table (version text, name text, sql text)
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

  return query
    select m.version, m.name, array_to_string(m.statements, E';\n\n') || ';'
    from supabase_migrations.schema_migrations m
    order by m.version;
end;
$$;

revoke all on function public.export_migrations() from public, anon;
grant execute on function public.export_migrations() to authenticated;;
