-- ============================================================
-- إنشاء وإدارة المستخدمين من داخل النظام
-- تكتب في auth.users مباشرة مع تشفير bcrypt، وتُنشئ الهوية والملف الشخصي
-- محميّة بصلاحية users.create / users.update
-- ============================================================

create or replace function public.create_office_user(
  _email     text,
  _password  text,
  _username  text,
  _full_name text,
  _role_code text,
  _phone     text default null,
  _job_title text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  _uid     uuid := gen_random_uuid();
  _role_id uuid;
  _email_n text := lower(btrim(_email));
begin
  if not public.has_perm('users','create') then
    raise exception 'ليس لديك صلاحية إنشاء مستخدمين' using errcode = '42501';
  end if;

  if _password is null or length(_password) < 8 then
    raise exception 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' using errcode = '22023';
  end if;

  select id into _role_id from public.roles where code = _role_code;
  if _role_id is null then
    raise exception 'الدور غير موجود: %', _role_code using errcode = '23503';
  end if;

  if exists (select 1 from auth.users where lower(email) = _email_n) then
    raise exception 'البريد الإلكتروني مستخدم مسبقًا' using errcode = '23505';
  end if;

  if exists (select 1 from public.profiles where lower(username) = lower(btrim(_username))) then
    raise exception 'اسم المستخدم مستخدم مسبقًا' using errcode = '23505';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', _uid, 'authenticated', 'authenticated',
    _email_n, extensions.crypt(_password, extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', _full_name, 'username', _username),
    '', '', '', ''
  );

  insert into auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    _uid::text, _uid,
    jsonb_build_object('sub', _uid::text, 'email', _email_n, 'email_verified', true, 'phone_verified', false),
    'email', now(), now(), now()
  );

  insert into public.profiles (id, username, full_name, email, phone, job_title, role_id)
  values (_uid, btrim(_username), btrim(_full_name), _email_n, _phone, _job_title, _role_id);

  perform public.write_audit_log(
    'create', 'profiles', _uid::text, _full_name,
    'إنشاء مستخدم جديد بدور ' || _role_code
  );

  return _uid;
end;
$$;

-- تعيين كلمة مرور مستخدم (إعادة تعيين من قِبل المدير)
create or replace function public.set_user_password(_user_id uuid, _password text)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
begin
  if not public.has_perm('users','update') then
    raise exception 'ليس لديك صلاحية تعديل المستخدمين' using errcode = '42501';
  end if;

  if _password is null or length(_password) < 8 then
    raise exception 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' using errcode = '22023';
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(_password, extensions.gen_salt('bf')),
         updated_at = now()
   where id = _user_id;

  if not found then
    raise exception 'المستخدم غير موجود' using errcode = 'P0002';
  end if;

  perform public.write_audit_log(
    'password_change', 'profiles', _user_id::text, null,
    'إعادة تعيين كلمة المرور بواسطة مدير'
  );
end;
$$;

-- التحقق من كلمة مرور المستخدم الحالي (قبل السماح بتغييرها)
create or replace function public.verify_my_password(_password text)
returns boolean
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  _hash text;
begin
  select encrypted_password into _hash from auth.users where id = auth.uid();
  if _hash is null then
    return false;
  end if;
  return _hash = extensions.crypt(_password, _hash);
end;
$$;

revoke all on function public.create_office_user(text,text,text,text,text,text,text) from public, anon;
revoke all on function public.set_user_password(uuid,text) from public, anon;
revoke all on function public.verify_my_password(text) from public, anon;

grant execute on function public.create_office_user(text,text,text,text,text,text,text) to authenticated;
grant execute on function public.set_user_password(uuid,text) to authenticated;
grant execute on function public.verify_my_password(text) to authenticated;
;