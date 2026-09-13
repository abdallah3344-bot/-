-- يضيف المفاتيح الأجنبية لمولّد الأنواع حتى تُدعم الاستعلامات المتداخلة
create or replace function public.introspect_schema()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
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
             'generated', a.attidentity <> ''
           ) order by a.attnum)
           from pg_attribute a
           where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
          ) as columns,
          coalesce((
            select jsonb_agg(jsonb_build_object(
              'constraint_name', con.conname,
              'columns',   (select jsonb_agg(att.attname order by u.ord)
                            from unnest(con.conkey) with ordinality as u(attnum, ord)
                            join pg_attribute att on att.attrelid = con.conrelid and att.attnum = u.attnum),
              'ref_table', ref.relname,
              'ref_columns', (select jsonb_agg(att.attname order by u.ord)
                              from unnest(con.confkey) with ordinality as u(attnum, ord)
                              join pg_attribute att on att.attrelid = con.confrelid and att.attnum = u.attnum),
              'is_one_to_one', exists (
                select 1 from pg_constraint uq
                where uq.conrelid = con.conrelid
                  and uq.contype in ('u','p')
                  and uq.conkey @> con.conkey
                  and con.conkey @> uq.conkey
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
        select
          p.proname as function_name,
          pg_get_function_arguments(p.oid) as args,
          pg_get_function_result(p.oid)    as returns
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.prokind = 'f'
          and has_function_privilege('authenticated', p.oid, 'EXECUTE')
      ) f
    )
  );
$$;

revoke all on function public.introspect_schema() from public, anon;
grant execute on function public.introspect_schema() to authenticated;
;