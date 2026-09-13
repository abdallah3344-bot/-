-- يعرض بنية المخطط لمولّد الأنواع (TypeScript)
create or replace function public.introspect_schema()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'tables', (
      select jsonb_agg(t)
      from (
        select
          c.relname as table_name,
          (select jsonb_agg(jsonb_build_object(
             'name', a.attname,
             'type', format_type(a.atttypid, a.atttypmod),
             'nullable', not a.attnotnull,
             'has_default', a.atthasdef or a.attidentity <> '',
             'generated', a.attidentity <> ''
           ) order by a.attnum)
           from pg_attribute a
           where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
          ) as columns
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r'
        order by c.relname
      ) t
    ),
    'functions', (
      select jsonb_agg(f)
      from (
        select
          p.proname as function_name,
          pg_get_function_arguments(p.oid) as args,
          pg_get_function_result(p.oid)    as returns
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.prokind = 'f'
          and has_function_privilege('authenticated', p.oid, 'EXECUTE')
        order by p.proname
      ) f
    )
  );
$$;

revoke all on function public.introspect_schema() from public, anon;
grant execute on function public.introspect_schema() to authenticated;
;