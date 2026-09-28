-- ============================================================
-- إصلاح: تغيير البريد من «تعديل المستخدم» كان يقفل الحساب
-- ------------------------------------------------------------
-- التعديل يغيّر profiles.email فقط، بينما الدخول كان يبحث عن
-- الحساب في auth.users بالبريد الجديد فلا يجده ⇒ «بيانات خاطئة».
--  1. الدخول يربط الملف بالحساب بالمعرّف (id) لا بالبريد، ويرجع بريد
--     الدخول الفعلي من auth.users.
--  2. تغيير البريد في الملف ينتقل إلى auth.users فورًا (مع منع التكرار).
--  3. مزامنة أي حساب اختلف بريده قبل هذا الإصلاح.
-- ============================================================

create or replace function public.resolve_login_email(identifier text, password text)
returns text
language plpgsql
volatile
security definer
set search_path to 'public', 'auth', 'extensions', 'pg_temp'
as $function$
declare
  _email text; _hash text; _ip text; _fails int;
  _max_fails constant int      := 10;
  _window    constant interval := interval '15 minutes';
  _ident text := lower(btrim(coalesce(identifier, '')));
begin
  if identifier is null or password is null or _ident = '' then return null; end if;

  begin
    _ip := coalesce(
      nullif(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1), ''),
      current_setting('request.headers', true)::json ->> 'cf-connecting-ip');
  exception when others then _ip := null;
  end;

  select count(*) into _fails
    from public.login_attempts la
   where lower(la.identifier) = _ident and la.success = false
     and la.attempted_at > now() - _window;

  if _fails >= _max_fails then
    insert into public.login_attempts (identifier, ip, success) values (_ident, _ip, false);
    return null;
  end if;

  select u.email, u.encrypted_password into _email, _hash
    from public.profiles p
    join auth.users u on u.id = p.id
    join public.offices o on o.id = p.office_id and o.is_active
   where (lower(p.username) = _ident or lower(p.email) = _ident or lower(u.email) = _ident)
     and p.is_active and p.deleted_at is null
   limit 1;

  if _email is null or _hash is null or _hash <> extensions.crypt(password, _hash) then
    insert into public.login_attempts (identifier, ip, success) values (_ident, _ip, false);
    return null;
  end if;

  insert into public.login_attempts (identifier, ip, success) values (_ident, _ip, true);

  delete from public.login_attempts la
   where lower(la.identifier) = _ident and la.success = false
     and la.attempted_at > now() - _window;

  delete from public.login_attempts la where la.attempted_at < now() - interval '30 days';

  return _email;
end;
$function$;

grant execute on function public.resolve_login_email(text, text) to anon, authenticated;

create or replace function public.sync_profile_email_to_auth()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
declare
  _new text := lower(btrim(new.email));
begin
  if _new is null or _new = '' or _new is not distinct from lower(btrim(old.email)) then
    return new;
  end if;
  if exists (select 1 from auth.users u where lower(u.email) = _new and u.id <> new.id) then
    raise exception 'البريد الإلكتروني مستخدم لحساب آخر' using errcode = '23505';
  end if;
  new.email := _new;
  update auth.users set email = _new, updated_at = now() where id = new.id;
  update auth.identities
     set identity_data = jsonb_set(identity_data, '{email}', to_jsonb(_new)), updated_at = now()
   where user_id = new.id and provider = 'email';
  return new;
end;
$$;

revoke all on function public.sync_profile_email_to_auth() from public, anon, authenticated;

drop trigger if exists profiles_sync_auth_email on public.profiles;
create trigger profiles_sync_auth_email
  before update of email on public.profiles
  for each row execute function public.sync_profile_email_to_auth();

-- مزامنة الحسابات التي اختلف بريدها (يُعتمد بريد الملف — هو ما أدخله المستخدم)
update auth.users u
   set email = lower(btrim(p.email)), updated_at = now()
  from public.profiles p
 where p.id = u.id
   and lower(btrim(p.email)) is distinct from lower(u.email)
   and not exists (select 1 from auth.users u2 where lower(u2.email) = lower(btrim(p.email)) and u2.id <> u.id);

update auth.identities i
   set identity_data = jsonb_set(i.identity_data, '{email}', to_jsonb(lower(u.email)))
  from auth.users u
 where u.id = i.user_id and i.provider = 'email'
   and (i.identity_data ->> 'email') is distinct from lower(u.email);
