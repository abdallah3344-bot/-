-- دالة مؤقتة لتصدير ملفات الهجرة إلى المستودع (تُحذف بعد الاستخدام)
create or replace function public.export_migrations()
returns table (version text, name text, sql text)
language sql
stable
security definer
set search_path = supabase_migrations, public, pg_temp
as $$
  select m.version, m.name, array_to_string(m.statements, E';\n\n') || ';'
  from supabase_migrations.schema_migrations m
  order by m.version;
$$;

revoke all on function public.export_migrations() from public, anon;
grant execute on function public.export_migrations() to authenticated;
;