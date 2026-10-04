-- ============================================================
-- صفحة المالك: حالة الترخيص الحيّة من لوحة التراخيص
-- ------------------------------------------------------------
-- platform_license_refs: مفتاح كل مكتب ومعرّف جهازه، لمالك المنصة فقط،
-- كي تسأل الصفحة لوحة التراخيص مباشرة بدل الاعتماد على آخر حالة محفوظة.
-- platform_sync_license_state: تحدّث الحالة المحفوظة بما رجع من اللوحة.
-- ============================================================

create or replace function public.platform_license_refs()
returns table (office_id uuid, license_key text, device_id text)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'هذه الدالة لمالك المنصة فقط' using errcode = '42501';
  end if;
  return query select ls.office_id, ls.license_key, ls.device_id from public.license_state ls;
end;
$$;

revoke all on function public.platform_license_refs() from public, anon;
grant execute on function public.platform_license_refs() to authenticated;

create or replace function public.platform_sync_license_state(p_office uuid, p_state text)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'هذه الدالة لمالك المنصة فقط' using errcode = '42501';
  end if;
  if p_state not in ('licensed_valid', 'trial_active', 'trial_pending', 'trial_expired', 'trial_rejected', 'expired') then
    return;
  end if;
  update public.license_state
     set last_state = p_state, last_verified_at = now()
   where office_id = p_office and last_state is distinct from p_state;
end;
$$;

revoke all on function public.platform_sync_license_state(uuid, text) from public, anon;
grant execute on function public.platform_sync_license_state(uuid, text) to authenticated;
