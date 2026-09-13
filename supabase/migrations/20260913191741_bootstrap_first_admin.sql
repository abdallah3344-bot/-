-- ============================================================
-- إنشاء أول حساب مدير نظام (bootstrap)
-- يُنفَّذ مرة واحدة فقط — الدالة تُحذف بعد الاستخدام
-- ============================================================

do $bootstrap$
declare
  _uid     uuid := gen_random_uuid();
  _role_id uuid;
begin
  if exists (select 1 from public.profiles) then
    raise notice 'يوجد مستخدمون بالفعل — تم تخطي البذر';
    return;
  end if;

  select id into _role_id from public.roles where code = 'super_admin';

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', _uid, 'authenticated', 'authenticated',
    'admin@lawoffice.local',
    extensions.crypt('Admin@2026', extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"مدير النظام","username":"admin"}'::jsonb,
    '', '', '', ''
  );

  insert into auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    _uid::text, _uid,
    jsonb_build_object('sub', _uid::text, 'email', 'admin@lawoffice.local',
                       'email_verified', true, 'phone_verified', false),
    'email', now(), now(), now()
  );

  insert into public.profiles (id, username, full_name, email, job_title, role_id)
  values (_uid, 'admin', 'مدير النظام', 'admin@lawoffice.local', 'مدير النظام', _role_id);

  raise notice 'تم إنشاء حساب المدير: admin / Admin@2026';
end;
$bootstrap$;
;