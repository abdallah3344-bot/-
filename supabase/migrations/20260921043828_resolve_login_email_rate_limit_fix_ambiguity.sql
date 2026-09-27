-- resolve_login_email مع حدّ للمحاولات الفاشلة (10 خلال 15 دقيقة لكل معرّف)
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

  select p.email into _email from public.profiles p
   where (lower(p.username) = _ident or lower(p.email) = _ident)
     and p.is_active and p.deleted_at is null limit 1;

  if _email is not null then
    select u.encrypted_password into _hash from auth.users u
     where lower(u.email) = lower(_email) limit 1;
  end if;

  if _email is null or _hash is null or _hash <> extensions.crypt(password, _hash) then
    insert into public.login_attempts (identifier, ip, success) values (_ident, _ip, false);
    return null;
  end if;

  insert into public.login_attempts (identifier, ip, success) values (_ident, _ip, true);

  delete from public.login_attempts la
   where lower(la.identifier) = _ident and la.success = false
     and la.attempted_at > now() - _window;

  -- تنظيف دوري خفيف
  delete from public.login_attempts la where la.attempted_at < now() - interval '30 days';

  return _email;
end;
$function$;

grant execute on function public.resolve_login_email(text, text) to anon, authenticated;
