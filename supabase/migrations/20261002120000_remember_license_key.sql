-- ============================================================
-- حفظ مفتاح ترخيص المكتب بعد أول تحقق ناجح
-- ------------------------------------------------------------
-- كل متصفح صار جهازًا مستقلًا في الترخيص، والتحقق بجهاز جديد يحتاج
-- مفتاح ترخيص المكتب. المكاتب التي بدأت بطلب تجريبي (بالجوال) لم
-- يُحفظ لها مفتاح — يحفظه الخادم هنا مرة واحدة ولا يكتب فوق مفتاح قائم.
-- ============================================================
create or replace function public.remember_license_key(p_key text)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if p_key is null or p_key !~ '^[A-Za-z0-9-]{8,80}$' then
    return;
  end if;
  update public.license_state
     set license_key = p_key
   where office_id = public.current_office_id()
     and license_key is null;
end;
$$;

revoke all on function public.remember_license_key(text) from public, anon;
grant execute on function public.remember_license_key(text) to authenticated;
