-- ============================================================
-- تعدد المكاتب (2/3): الدوال والتخزين وتسجيل المكاتب الجديدة
-- ------------------------------------------------------------
-- دوال SECURITY DEFINER تتجاوز RLS، فكل واحدة تقرأ أو تكتب بيانات
-- أعمال قُيِّدت هنا صراحةً بمكتب المستدعي. الدوال العادية (invoker)
-- مثل global_search و dashboard_stats لا تحتاج تعديلًا: RLS يسري عليها.
-- ============================================================

-- العدّاد التسلسلي: لكل مكتب عدّاداته
create or replace function public.next_sequence_number(_office uuid, _key text, _prefix text)
returns text
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  _n bigint;
  _k text;
begin
  if _office is null then
    raise exception 'لا يمكن الترقيم بلا مكتب' using errcode = '42501';
  end if;
  _k := _office::text || ':' || _key;

  insert into public.number_sequences (key, last_value)
  values (_k, 1)
  on conflict (key) do update set last_value = public.number_sequences.last_value + 1
  returning last_value into _n;

  return _prefix || '-' || to_char(now(), 'YYYY') || '-' || lpad(_n::text, 5, '0');
end;
$$;

-- النسخة القديمة (مفتاح بلا مكتب) تمرّ عبر مكتب المستدعي
create or replace function public.next_sequence_number(_key text, _prefix text)
returns text
language sql
security definer
set search_path to 'public', 'pg_temp'
as $$ select public.next_sequence_number(public.current_office_id(), _key, _prefix) $$;

revoke all on function public.next_sequence_number(uuid, text, text) from public, anon, authenticated;
revoke all on function public.next_sequence_number(text, text) from public, anon, authenticated;

-- ---------- assign_case_no ----------
CREATE OR REPLACE FUNCTION public.assign_case_no()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare _p text;
begin
  if new.internal_no is null or btrim(new.internal_no) = '' then
    select case_prefix into _p from public.settings where office_id = new.office_id;
    new.internal_no := public.next_sequence_number(new.office_id, 'cases', coalesce(_p,'CS'));
  end if;
  return new;
end $function$
;;

-- ---------- assign_client_no ----------
CREATE OR REPLACE FUNCTION public.assign_client_no()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare _p text;
begin
  if new.client_no is null or btrim(new.client_no) = '' then
    select client_prefix into _p from public.settings where office_id = new.office_id;
    new.client_no := public.next_sequence_number(new.office_id, 'clients', coalesce(_p,'CL'));
  end if;
  return new;
end $function$
;;

-- ---------- assign_invoice_no ----------
CREATE OR REPLACE FUNCTION public.assign_invoice_no()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare _p text;
begin
  if new.invoice_no is null or btrim(new.invoice_no) = '' then
    select invoice_prefix into _p from public.settings where office_id = new.office_id;
    new.invoice_no := public.next_sequence_number(new.office_id, 'invoices', coalesce(_p,'INV'));
  end if;
  return new;
end $function$
;;

-- ---------- assign_receipt_no ----------
CREATE OR REPLACE FUNCTION public.assign_receipt_no()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare _p text;
begin
  if new.receipt_no is null or btrim(new.receipt_no) = '' then
    select receipt_prefix into _p from public.settings where office_id = new.office_id;
    new.receipt_no := public.next_sequence_number(new.office_id, 'payments', coalesce(_p,'REC'));
  end if;
  return new;
end $function$
;;

-- ---------- assign_contract_no ----------
CREATE OR REPLACE FUNCTION public.assign_contract_no()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if new.contract_no is null or btrim(new.contract_no) = '' then
    new.contract_no := public.next_sequence_number(new.office_id, 'contracts', 'CNT');
  end if;
  return new;
end $function$
;;

-- ---------- assign_poa_no ----------
CREATE OR REPLACE FUNCTION public.assign_poa_no()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if new.poa_no is null or btrim(new.poa_no) = '' then
    new.poa_no := public.next_sequence_number(new.office_id, 'poa', 'POA');
  end if;
  return new;
end $function$
;;

-- ---------- assign_correspondence_no ----------
CREATE OR REPLACE FUNCTION public.assign_correspondence_no()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if new.reference_no is null or btrim(new.reference_no) = '' then
    new.reference_no := public.next_sequence_number(
      new.office_id,
      'correspondence_' || new.direction,
      case when new.direction = 'outgoing' then 'OUT' else 'IN' end);
  end if;
  return new;
end $function$
;;

-- ---------- generate_notifications ----------
CREATE OR REPLACE FUNCTION public.generate_notifications(_force boolean DEFAULT false)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  _uid      uuid := auth.uid();
  _settings public.notification_settings%rowtype;
  _created  integer := 0;
  _n        integer;
  _office   uuid := public.current_office_id();
begin
  if _uid is null or _office is null then
    return 0;
  end if;

  select * into _settings from public.notification_settings where user_id = _uid;
  if not found then
    insert into public.notification_settings (user_id) values (_uid)
    returning * into _settings;
  end if;

  -- كبح: لا نُعيد الفحص إن جرى خلال العشر دقائق الماضية
  if not _force
     and _settings.last_generated_at is not null
     and _settings.last_generated_at > now() - interval '10 minutes' then
    return 0;
  end if;

  update public.notification_settings
     set last_generated_at = now()
   where user_id = _uid;

  -- ---------- الجلسات القادمة ----------
  if _settings.hearing_reminder then
    insert into public.notifications (user_id, kind, title, body, entity, entity_id, link, severity)
    select
      _uid,
      case when h.hearing_date = current_date then 'hearing_today' else 'hearing_tomorrow' end,
      case when h.hearing_date = current_date
           then 'لديك جلسة اليوم'
           else 'لديك جلسة بعد ' || (h.hearing_date - current_date) || ' يوم' end,
      c.title || coalesce(' — ' || ct.name_ar, '') || coalesce(' · قاعة ' || h.room, ''),
      'hearings', h.id, '/cases/' || c.id,
      case when h.hearing_date = current_date then 'danger' else 'warning' end
    from public.hearings h
    join public.cases c on c.id = h.case_id
    left join public.courts ct on ct.id = h.court_id
    where h.office_id = _office and h.deleted_at is null
      and h.status = 'scheduled'
      and h.hearing_date between current_date and current_date + _settings.hearing_days_before
      and (h.assigned_lawyer_id = _uid
           or c.responsible_lawyer_id = _uid
           or c.assistant_lawyer_id = _uid
           or not public.is_lawyer_scoped())
    on conflict do nothing;
    get diagnostics _n = row_count; _created := _created + _n;
  end if;

  -- ---------- المهام المتأخرة ----------
  if _settings.task_reminder then
    insert into public.notifications (user_id, kind, title, body, entity, entity_id, link, severity)
    select
      _uid, 'task_overdue', 'لديك مهمة متأخرة',
      t.title || ' — تأخّرت ' || (current_date - t.due_date) || ' يوم',
      'tasks', t.id, '/tasks', 'danger'
    from public.tasks t
    where t.office_id = _office and t.deleted_at is null
      and t.status not in ('completed', 'cancelled')
      and t.due_date is not null
      and t.due_date < current_date
      and (t.assignee_id = _uid or t.assignee_id is null)
    on conflict do nothing;
    get diagnostics _n = row_count; _created := _created + _n;
  end if;

  -- ---------- أقساط مستحقة ----------
  if _settings.installment_reminder and public.has_perm('fees', 'view') then
    insert into public.notifications (user_id, kind, title, body, entity, entity_id, link, severity)
    select
      _uid, 'installment_due', 'يوجد قسط مستحق',
      'قسط رقم ' || fi.seq || ' بمبلغ ' || fi.amount || ' — القضية: ' || c.title,
      'fee_installments', fi.id, '/fees', 'warning'
    from public.fee_installments fi
    join public.case_fees cf on cf.id = fi.case_fee_id
    join public.cases c on c.id = cf.case_id
    where fi.office_id = _office and fi.status in ('pending', 'partial', 'overdue')
      and fi.due_date <= current_date
    on conflict do nothing;
    get diagnostics _n = row_count; _created := _created + _n;
  end if;

  -- ---------- عقود توشك على الانتهاء ----------
  if _settings.contract_reminder and public.has_perm('contracts', 'view') then
    insert into public.notifications (user_id, kind, title, body, entity, entity_id, link, severity)
    select
      _uid, 'contract_expiring',
      'العقد سينتهي بعد ' || (ct.end_date - current_date) || ' يوم',
      ct.title || coalesce(' — ' || cl.name, ''),
      'contracts', ct.id, '/contracts', 'warning'
    from public.contracts ct
    left join public.clients cl on cl.id = ct.client_id
    where ct.office_id = _office and ct.deleted_at is null
      and ct.status = 'active'
      and ct.end_date is not null
      and ct.end_date between current_date and current_date + _settings.contract_days_before
    on conflict do nothing;
    get diagnostics _n = row_count; _created := _created + _n;
  end if;

  -- ---------- وكالات توشك على الانتهاء ----------
  if _settings.poa_reminder and public.has_perm('poa', 'view') then
    insert into public.notifications (user_id, kind, title, body, entity, entity_id, link, severity)
    select
      _uid, 'poa_expiring',
      'الوكالة ستنتهي بعد ' || (p.expires_at - current_date) || ' يوم',
      'وكالة رقم ' || p.poa_no || coalesce(' — ' || cl.name, ''),
      'powers_of_attorney', p.id, '/powers-of-attorney', 'warning'
    from public.powers_of_attorney p
    left join public.clients cl on cl.id = p.client_id
    where p.office_id = _office and p.deleted_at is null
      and p.status = 'active'
      and p.expires_at is not null
      and p.expires_at between current_date and current_date + _settings.poa_days_before
    on conflict do nothing;
    get diagnostics _n = row_count; _created := _created + _n;
  end if;

  -- ---------- فواتير متأخرة ----------
  if _settings.invoice_reminder and public.has_perm('invoices', 'view') then
    insert into public.notifications (user_id, kind, title, body, entity, entity_id, link, severity)
    select
      _uid, 'invoice_overdue', 'فاتورة تجاوزت تاريخ استحقاقها',
      'الفاتورة ' || i.invoice_no || ' — المتبقي ' || (i.total - i.paid_amount)
        || coalesce(' — ' || cl.name, ''),
      'invoices', i.id, '/invoices/' || i.id, 'danger'
    from public.invoices i
    left join public.clients cl on cl.id = i.client_id
    where i.office_id = _office and i.deleted_at is null
      and i.status in ('issued', 'partial', 'overdue')
      and i.due_date is not null
      and i.due_date < current_date
    on conflict do nothing;
    get diagnostics _n = row_count; _created := _created + _n;
  end if;

  return _created;
end;
$function$
;;

-- ---------- create_default_notification_settings ----------
CREATE OR REPLACE FUNCTION public.create_default_notification_settings()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  insert into public.notification_settings (user_id, office_id)
  values (new.id, new.office_id)
  on conflict (user_id) do nothing;
  return new;
end;
$function$
;;

-- ---------- log_case_status_change ----------
CREATE OR REPLACE FUNCTION public.log_case_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if new.status is distinct from old.status then
    insert into public.case_status_history (case_id, from_status, to_status, changed_by, office_id)
    values (new.id, old.status, new.status, auth.uid(), new.office_id);
  end if;
  return new;
end;
$function$
;;

-- ---------- mark_overdue_tasks ----------
CREATE OR REPLACE FUNCTION public.mark_overdue_tasks()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  _n integer;
begin
  update public.tasks
     set status = 'late'
   where office_id = public.current_office_id()
     and deleted_at is null
     and status in ('new','in_progress')
     and due_date is not null
     and due_date < current_date;
  get diagnostics _n = row_count;
  return _n;
end;
$function$
;;

-- ---------- soft_delete ----------
CREATE OR REPLACE FUNCTION public.soft_delete(_entity text, _id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  _module text;
  _label  text;
begin
  _module := case _entity
    when 'clients'            then 'clients'
    when 'cases'              then 'cases'
    when 'hearings'           then 'hearings'
    when 'tasks'              then 'tasks'
    when 'documents'          then 'documents'
    when 'powers_of_attorney' then 'poa'
    when 'contracts'          then 'contracts'
    when 'invoices'           then 'invoices'
    when 'payments'           then 'payments'
    when 'expenses'           then 'expenses'
    when 'correspondence'     then 'correspondence'
    when 'appointments'       then 'calendar'
    when 'accounts'           then 'accounts'
    when 'profiles'           then 'users'
    else null
  end;

  if _module is null then
    raise exception 'كيان غير مدعوم للحذف: %', _entity using errcode = '22023';
  end if;

  if not public.has_perm(_module, 'delete') then
    raise exception 'ليس لديك صلاحية الحذف في هذه الوحدة' using errcode = '42501';
  end if;

  execute format('update public.%I set deleted_at = now() where id = $1 and deleted_at is null and office_id = $2', _entity)
    using _id, public.current_office_id();

  perform public.write_audit_log('delete', _entity, _id::text, _label, 'حذف ناعم');
end;
$function$
;;

-- ---------- restore_record ----------
CREATE OR REPLACE FUNCTION public.restore_record(_entity text, _id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if not public.has_perm('archive', 'approve') then
    raise exception 'ليس لديك صلاحية الاستعادة' using errcode = '42501';
  end if;

  if _entity !~ '^[a-z_]+$' then
    raise exception 'كيان غير صالح' using errcode = '22023';
  end if;

  execute format('update public.%I set deleted_at = null where id = $1 and office_id = $2', _entity) using _id, public.current_office_id();
  perform public.write_audit_log('restore', _entity, _id::text, null, 'استعادة سجل محذوف');
end;
$function$
;;

-- ---------- set_user_password ----------
CREATE OR REPLACE FUNCTION public.set_user_password(_user_id uuid, _password text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions', 'pg_temp'
AS $function$
begin
  if not public.has_perm('users','update') then
    raise exception 'ليس لديك صلاحية تعديل المستخدمين' using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = _user_id
                   and office_id = public.current_office_id()) then
    raise exception 'المستخدم غير موجود' using errcode = 'P0002';
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
$function$
;;

-- ---------- touch_license_state ----------
CREATE OR REPLACE FUNCTION public.touch_license_state(p_state text, p_message text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- تسجيل آخر نتيجة تحقّق لأغراض العرض. متاحة لكل مستخدم مسجَّل
  -- لأنها لا تمنح وصولًا: قرار السماح يُتخذ من رد خادم التراخيص
  -- في كل طلب، لا من هذا الصف.
  update public.license_state
     set last_state       = p_state,
         last_message     = p_message,
         last_verified_at = now()
   where office_id = public.current_office_id();
end;
$function$
;;

-- ---------- write_audit_log ----------
CREATE OR REPLACE FUNCTION public.write_audit_log(_action text, _entity text, _entity_id text DEFAULT NULL::text, _entity_label text DEFAULT NULL::text, _summary text DEFAULT NULL::text, _changes jsonb DEFAULT NULL::jsonb, _ip text DEFAULT NULL::text, _user_agent text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  _uid  uuid := auth.uid();
  _name text;
begin
  select full_name into _name from public.profiles where id = _uid;

  insert into public.audit_logs (
    office_id, user_id, user_name, action, entity, entity_id,
    entity_label, summary, changes, ip_address, user_agent
  )
  values (
    public.current_office_id(), _uid, coalesce(_name, 'غير معروف'), _action, _entity, _entity_id,
    _entity_label, _summary, _changes, _ip, _user_agent
  );
end;
$function$
;;

-- ---------- create_office_user ----------
CREATE OR REPLACE FUNCTION public.create_office_user(_email text, _password text, _username text, _full_name text, _role_code text, _phone text DEFAULT NULL::text, _job_title text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions', 'pg_temp'
AS $function$
declare
  _uid     uuid := gen_random_uuid();
  _role_id uuid;
  _email_n text := lower(btrim(_email));
  _office  uuid := public.current_office_id();
begin
  if not public.has_perm('users','create') then
    raise exception 'ليس لديك صلاحية إنشاء مستخدمين' using errcode = '42501';
  end if;

  if _office is null then
    raise exception 'لا يوجد مكتب مرتبط بحسابك' using errcode = '42501';
  end if;

  if _password is null or length(_password) < 8 then
    raise exception 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' using errcode = '22023';
  end if;

  select id into _role_id from public.roles where code = _role_code and office_id = _office;
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

  insert into public.profiles (id, office_id, username, full_name, email, phone, job_title, role_id)
  values (_uid, _office, btrim(_username), btrim(_full_name), _email_n, _phone, _job_title, _role_id);

  perform public.write_audit_log(
    'create', 'profiles', _uid::text, _full_name,
    'إنشاء مستخدم جديد بدور ' || _role_code
  );

  return _uid;
end;
$function$
;;

-- ---------- resolve_login_email ----------
CREATE OR REPLACE FUNCTION public.resolve_login_email(identifier text, password text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions', 'pg_temp'
AS $function$
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
    join public.offices o on o.id = p.office_id and o.is_active
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
$function$
;;

-- ---------- clear_demo_data ----------
CREATE OR REPLACE FUNCTION public.clear_demo_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare _removed integer := 0; _n integer; _o uuid := public.current_office_id();
begin
  if not public.has_perm('settings','update') then
    raise exception 'يتطلب حذف البيانات التجريبية صلاحية إدارة الإعدادات'
      using errcode = '42501';
  end if;

  delete from public.payments       where is_demo and office_id = _o; get diagnostics _n = row_count; _removed := _removed + _n;
  delete from public.invoices       where is_demo and office_id = _o; get diagnostics _n = row_count; _removed := _removed + _n;
  delete from public.expenses       where is_demo and office_id = _o; get diagnostics _n = row_count; _removed := _removed + _n;
  delete from public.case_fees      where is_demo and office_id = _o; get diagnostics _n = row_count; _removed := _removed + _n;
  delete from public.correspondence where is_demo and office_id = _o; get diagnostics _n = row_count; _removed := _removed + _n;
  delete from public.documents      where is_demo and office_id = _o; get diagnostics _n = row_count; _removed := _removed + _n;
  delete from public.tasks          where is_demo and office_id = _o; get diagnostics _n = row_count; _removed := _removed + _n;
  delete from public.hearings       where is_demo and office_id = _o; get diagnostics _n = row_count; _removed := _removed + _n;
  delete from public.opponents      where is_demo and office_id = _o; get diagnostics _n = row_count; _removed := _removed + _n;
  delete from public.cases          where is_demo and office_id = _o; get diagnostics _n = row_count; _removed := _removed + _n;
  delete from public.clients        where is_demo and office_id = _o; get diagnostics _n = row_count; _removed := _removed + _n;

  return jsonb_build_object('ok', true, 'removed', _removed);
end;
$function$
;;

-- seed_demo_data: reads → case_types, clients, courts, document_categories, expense_categories

-- ---------- seed_demo_data ----------
CREATE OR REPLACE FUNCTION public.seed_demo_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  _uid        uuid := auth.uid();
  _client_ids uuid[] := '{}';
  _case_ids   uuid[] := '{}';
  _client_id  uuid;
  _case_id    uuid;
  _invoice_id uuid;
  _fee_id     uuid;
  _type_id    uuid;
  _court_id   uuid;
  _cat_id     uuid;
  _exp_cat    uuid;
  _i          integer;
  _office     uuid := public.current_office_id();
  _names      text[] := array[
    'شركة الأمل للتجارة العامة', 'مؤسسة النهضة للمقاولات', 'محمد خالد عبد الله',
    'شركة القدس للاستثمار', 'سميرة يوسف حمدان'
  ];
  _types      text[] := array['individual','company','institution','company','individual'];
  _titles     text[] := array[
    'مطالبة مالية ضد شركة الوفاء',
    'نزاع عقد مقاولة — مشروع رام الله',
    'دعوى عمالية — مستحقات نهاية الخدمة',
    'نزاع شراكة تجارية',
    'أحوال شخصية شرعية — حضانة'
  ];
begin
  if not public.has_perm('settings','update') then
    raise exception 'يتطلب توليد البيانات التجريبية صلاحية إدارة الإعدادات'
      using errcode = '42501';
  end if;

  if exists (select 1 from public.clients where is_demo and office_id = _office) then
    return jsonb_build_object('ok', false, 'message', 'البيانات التجريبية موجودة بالفعل.');
  end if;

  -- محكمة افتراضية إن لم توجد
  select id into _court_id from public.courts where office_id = _office limit 1;
  if _court_id is null then
    insert into public.courts (name_ar, court_type, governorate)
    values ('محكمة بداية رام الله', 'first_instance', 'رام الله والبيرة')
    returning id into _court_id;
  end if;

  select id into _cat_id  from public.document_categories where office_id = _office and name_ar = 'لائحة' limit 1;
  select id into _exp_cat from public.expense_categories  where office_id = _office and name_ar = 'رسوم محكمة' limit 1;

  -- ---------- خمسة عملاء ----------
  for _i in 1..5 loop
    insert into public.clients (
      name, client_type, national_id, phone, email, address,
      file_opened_at, responsible_lawyer_id, status, is_demo, created_by
    ) values (
      _names[_i], _types[_i],
      lpad((_i * 7919 % 1000000000)::text, 9, '0'),
      '059' || lpad((_i * 1237 % 10000000)::text, 7, '0'),
      'demo' || _i || '@example.com',
      'رام الله — الماصيون',
      current_date - (_i * 30), _uid, 'active', true, _uid
    )
    returning id into _client_id;
    _client_ids := _client_ids || _client_id;
  end loop;

  -- ---------- خمس قضايا ----------
  for _i in 1..5 loop
    select id into _type_id from public.case_types
      where is_active and office_id = _office order by sort_order offset ((_i - 1) % 14) limit 1;

    insert into public.cases (
      title, client_id, responsible_lawyer_id, case_type_id, court_id,
      court_case_no, governorate, registered_at, litigation_degree,
      claim_amount, priority, status, description, is_demo, created_by
    ) values (
      _titles[_i], _client_ids[_i], _uid, _type_id, _court_id,
      '2026/' || lpad((_i * 137)::text, 4, '0'),
      'رام الله والبيرة', current_date - (_i * 21), 'first_instance',
      (_i * 45000)::numeric,
      (array['medium','high','urgent','medium','low'])[_i],
      (array['in_progress','awaiting_hearing','new','awaiting_decision','in_progress'])[_i],
      'قضية تجريبية لأغراض الاختبار والعرض.', true, _uid
    )
    returning id into _case_id;
    _case_ids := _case_ids || _case_id;

    -- خصم لكل قضية
    insert into public.opponents (case_id, name, phone, lawyer_name, is_demo)
    values (_case_id, 'الطرف المقابل ' || _i,
            '05' || lpad((_i * 4441 % 100000000)::text, 8, '0'),
            'أ. محامي الخصم ' || _i, true);

    -- جلستان: واحدة سابقة وأخرى قادمة
    insert into public.hearings (
      case_id, court_id, hearing_date, hearing_time, room,
      assigned_lawyer_id, hearing_type, status, result, is_demo, created_by
    ) values (
      _case_id, _court_id, current_date - (_i * 7), '10:00', 'A-' || _i,
      _uid, 'session', 'held', 'حضر الطرفان وطُلب أجل لتقديم المذكرات.', true, _uid
    );

    insert into public.hearings (
      case_id, court_id, hearing_date, hearing_time, room,
      assigned_lawyer_id, hearing_type, required_action, status, is_demo, created_by
    ) values (
      _case_id, _court_id, current_date + _i, '11:30', 'A-' || _i,
      _uid, 'pleading', 'تقديم المذكرة الجوابية والمستندات المؤيدة.',
      'scheduled', true, _uid
    );

    -- مهمة
    insert into public.tasks (
      title, case_id, client_id, assignee_id, due_date,
      priority, status, is_demo, created_by
    ) values (
      'إعداد مذكرة جوابية — ' || _titles[_i],
      _case_id, _client_ids[_i], _uid, current_date + (_i - 2),
      'high', case when _i <= 2 then 'in_progress' else 'new' end, true, _uid
    );

    -- أتعاب مع أقساط
    insert into public.case_fees (
      case_id, total_amount, advance_amount, installments_count,
      installment_amount, is_demo, created_by
    ) values (
      _case_id, (_i * 20000)::numeric, (_i * 5000)::numeric, 3,
      round(((_i * 20000 - _i * 5000) / 3.0)::numeric, 2), true, _uid
    )
    returning id into _fee_id;

    insert into public.fee_installments (case_fee_id, seq, amount, due_date, status)
    select _fee_id, s,
           round(((_i * 20000 - _i * 5000) / 3.0)::numeric, 2),
           current_date + (s * 30), 'pending'
    from generate_series(1, 3) s;

    -- مصروف
    insert into public.expenses (
      case_id, client_id, category_id, amount, spent_at,
      description, is_billable, is_demo, created_by
    ) values (
      _case_id, _client_ids[_i], _exp_cat, (_i * 500)::numeric,
      current_date - (_i * 10), 'رسوم رفع الدعوى', true, true, _uid
    );

    -- فاتورة ببند واحد
    insert into public.invoices (
      client_id, case_id, issue_date, due_date, tax_rate,
      status, is_demo, created_by
    ) values (
      _client_ids[_i], _case_id, current_date - (_i * 14),
      current_date + (30 - _i * 5), 0,
      'issued', true, _uid
    )
    returning id into _invoice_id;

    insert into public.invoice_items (invoice_id, description, quantity, unit_price, line_total)
    values (_invoice_id, 'أتعاب محاماة — ' || _titles[_i], 1,
            (_i * 8000)::numeric, (_i * 8000)::numeric);

    -- دفعة جزئية على أول ثلاث فواتير
    if _i <= 3 then
      insert into public.payments (
        client_id, case_id, invoice_id, amount, method, paid_at,
        received_by, is_demo, created_by
      ) values (
        _client_ids[_i], _case_id, _invoice_id, (_i * 3000)::numeric,
        'bank_transfer', current_date - (_i * 5), _uid, true, _uid
      );
    end if;

    -- مراسلة
    insert into public.correspondence (
      direction, party_type, party_name, subject, corr_date,
      client_id, case_id, owner_id, status, is_demo, created_by
    ) values (
      case when _i % 2 = 0 then 'incoming' else 'outgoing' end,
      'court', 'المحكمة التجارية — الدائرة ' || _i,
      'بخصوص القضية ' || _titles[_i], current_date - (_i * 3),
      _client_ids[_i], _case_id, _uid, 'open', true, _uid
    );
  end loop;

  return jsonb_build_object(
    'ok', true,
    'clients', 5, 'cases', 5, 'hearings', 10, 'tasks', 5,
    'invoices', 5, 'payments', 3, 'expenses', 5, 'correspondence', 5
  );
end;
$function$
;;

-- ============================================================
-- تجهيز مكتب جديد: الأدوار والقوائم المرجعية والإعدادات
-- ------------------------------------------------------------
-- تُنسخ من المكتب الأول: الأدوار وصلاحياتها، أنواع القضايا،
-- المحاكم ودوائرها، تصنيفات المستندات والمصروفات. لا تُنسخ أي
-- بيانات أعمال (موكّلون، قضايا، قضاة، قوالب…).
-- ============================================================
create or replace function public.seed_office(_office uuid, _name text, _phone text)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  _src uuid := (select id from public.offices where is_founding);
begin
  insert into public.roles (office_id, code, name_ar, description, is_system)
  select _office, code, name_ar, description, is_system
    from public.roles where office_id = _src;

  insert into public.role_permissions (office_id, role_id, permission_id)
  select _office, nr.id, rp.permission_id
    from public.role_permissions rp
    join public.roles sr on sr.id = rp.role_id and sr.office_id = _src
    join public.roles nr on nr.office_id = _office and nr.code = sr.code
   where rp.office_id = _src;

  insert into public.case_types (office_id, name_ar, color, sort_order, is_active)
  select _office, name_ar, color, sort_order, is_active from public.case_types where office_id = _src;

  insert into public.courts (office_id, name_ar, court_type, governorate, address, phone, is_active)
  select _office, name_ar, court_type, governorate, address, phone, is_active from public.courts where office_id = _src;

  insert into public.court_chambers (office_id, court_id, name_ar, is_active)
  select _office, nc.id, ch.name_ar, ch.is_active
    from public.court_chambers ch
    join public.courts oc on oc.id = ch.court_id and oc.office_id = _src
    join public.courts nc on nc.office_id = _office and nc.name_ar = oc.name_ar
                         and nc.governorate is not distinct from oc.governorate
   where ch.office_id = _src;

  insert into public.document_categories (office_id, name_ar, sort_order, is_active)
  select _office, name_ar, sort_order, is_active from public.document_categories where office_id = _src;

  insert into public.expense_categories (office_id, name_ar, sort_order, is_active)
  select _office, name_ar, sort_order, is_active from public.expense_categories where office_id = _src;

  insert into public.accounts (office_id, name, account_type, opening_balance)
  values (_office, 'الصندوق النقدي', 'cash', 0);

  insert into public.settings (office_id, office_name, office_phone)
  values (_office, _name, _phone);

  -- مدخلات الترخيص: الاسم والجوال يُرسَلان للوحة التراخيص في أول
  -- تحقّق فيصلك طلب تجريبي باسم المكتب
  insert into public.license_state (office_id, client_name, phone)
  values (_office, _name, _phone);
end;
$$;

revoke all on function public.seed_office(uuid, text, text) from public, anon, authenticated;

-- ============================================================
-- تسجيل مكتب جديد من صفحة التسجيل العامة
-- ------------------------------------------------------------
-- ينشئ المكتب ومديره. لا يمنح وصولًا للبيانات: المكتب لا يعمل حتى
-- تعتمد طلبه التجريبي من لوحة التراخيص.
-- ============================================================
create or replace function public.register_office(
  _office_name text,
  _full_name   text,
  _username    text,
  _email       text,
  _password    text,
  _phone       text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public', 'auth', 'extensions', 'pg_temp'
as $$
declare
  _office  uuid;
  _uid     uuid := gen_random_uuid();
  _role_id uuid;
  _ip      text;
  _email_n text := lower(btrim(coalesce(_email, '')));
  _user_n  text := btrim(coalesce(_username, ''));
  _phone_n text := regexp_replace(coalesce(_phone, ''), '[^0-9+]', '', 'g');
begin
  begin
    _ip := coalesce(
      nullif(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1), ''),
      current_setting('request.headers', true)::json ->> 'cf-connecting-ip');
  exception when others then _ip := null;
  end;

  -- حدّ التسجيل: 3 مكاتب لكل عنوان في اليوم، و20 للنظام كله في الساعة
  if _ip is not null and (select count(*) from public.offices
                           where created_ip = _ip and created_at > now() - interval '1 day') >= 3 then
    return jsonb_build_object('ok', false, 'error', 'تجاوزت حدّ التسجيل اليومي. حاول غدًا أو تواصل معنا.');
  end if;
  if (select count(*) from public.offices where created_at > now() - interval '1 hour') >= 20 then
    return jsonb_build_object('ok', false, 'error', 'التسجيل مزدحم الآن. حاول بعد قليل.');
  end if;

  if length(btrim(coalesce(_office_name, ''))) < 2 then
    return jsonb_build_object('ok', false, 'error', 'اسم المكتب مطلوب.');
  end if;
  if length(btrim(coalesce(_full_name, ''))) < 2 then
    return jsonb_build_object('ok', false, 'error', 'اسم المدير مطلوب.');
  end if;
  if _user_n !~ '^[A-Za-z0-9._-]{3,40}$' then
    return jsonb_build_object('ok', false, 'error', 'اسم المستخدم: 3 أحرف إنجليزية أو أرقام على الأقل، بلا مسافات.');
  end if;
  if _email_n !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'error', 'البريد الإلكتروني غير صحيح.');
  end if;
  if _password is null or length(_password) < 8 then
    return jsonb_build_object('ok', false, 'error', 'كلمة المرور 8 أحرف على الأقل.');
  end if;
  if length(_phone_n) < 9 then
    return jsonb_build_object('ok', false, 'error', 'رقم الجوال غير صحيح.');
  end if;

  if exists (select 1 from auth.users where lower(email) = _email_n) then
    return jsonb_build_object('ok', false, 'error', 'البريد الإلكتروني مسجَّل مسبقًا.');
  end if;
  if exists (select 1 from public.profiles where lower(username) = lower(_user_n)) then
    return jsonb_build_object('ok', false, 'error', 'اسم المستخدم محجوز. اختر اسمًا آخر.');
  end if;

  insert into public.offices (name, phone, email, created_ip)
  values (btrim(_office_name), _phone_n, _email_n, _ip)
  returning id into _office;

  perform public.seed_office(_office, btrim(_office_name), _phone_n);

  select id into _role_id from public.roles where office_id = _office and code = 'super_admin';
  if _role_id is null then
    raise exception 'دور المدير غير موجود في المكتب المصدر';
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
    jsonb_build_object('full_name', btrim(_full_name), 'username', _user_n),
    '', '', '', ''
  );

  insert into auth.identities (
    provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    _uid::text, _uid,
    jsonb_build_object('sub', _uid::text, 'email', _email_n, 'email_verified', true, 'phone_verified', false),
    'email', now(), now(), now()
  );

  insert into public.profiles (id, office_id, username, full_name, email, phone, role_id)
  values (_uid, _office, _user_n, btrim(_full_name), _email_n, _phone_n, _role_id);

  insert into public.audit_logs (office_id, user_id, user_name, action, entity, entity_id, entity_label, summary, ip_address)
  values (_office, _uid, btrim(_full_name), 'create', 'offices', _office::text, btrim(_office_name),
          'تسجيل مكتب جديد', _ip);

  return jsonb_build_object('ok', true, 'office_id', _office, 'username', _user_n);
end;
$$;

revoke all on function public.register_office(text, text, text, text, text, text) from public;
grant execute on function public.register_office(text, text, text, text, text, text) to anon, authenticated;

-- ============================================================
-- صفحة مالك المنصة
-- ============================================================
create or replace function public.platform_offices()
returns table (
  id uuid, name text, slug text, phone text, email text, is_active boolean, is_founding boolean,
  created_at timestamptz, users_count bigint, clients_count bigint, cases_count bigint,
  last_activity timestamptz, license_state text, license_checked_at timestamptz, admin_username text
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'هذه الصفحة لمالك المنصة فقط' using errcode = '42501';
  end if;

  -- أعداد فقط — لا تُكشف أي بيانات موكّلين أو قضايا للمالك
  return query
  select o.id, o.name, o.slug, o.phone, o.email, o.is_active, o.is_founding, o.created_at,
         (select count(*) from public.profiles p where p.office_id = o.id and p.deleted_at is null),
         (select count(*) from public.clients c where c.office_id = o.id and c.deleted_at is null),
         (select count(*) from public.cases cs where cs.office_id = o.id and cs.deleted_at is null),
         (select max(a.created_at) from public.audit_logs a where a.office_id = o.id),
         ls.last_state, ls.last_verified_at,
         (select p.username from public.profiles p join public.roles r on r.id = p.role_id
           where p.office_id = o.id and r.code = 'super_admin' and p.deleted_at is null
           order by p.created_at limit 1)
    from public.offices o
    left join public.license_state ls on ls.office_id = o.id
   order by o.is_founding desc, o.created_at desc;
end;
$$;

create or replace function public.platform_set_office_active(_office uuid, _active boolean)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'هذه العملية لمالك المنصة فقط' using errcode = '42501';
  end if;
  if not _active and exists (select 1 from public.offices where id = _office and is_founding) then
    raise exception 'لا يمكن إيقاف المكتب الأول' using errcode = '22023';
  end if;
  update public.offices set is_active = _active where id = _office;
  if not found then
    raise exception 'المكتب غير موجود' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.platform_set_office_slug(_office uuid, _slug text)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'هذه العملية لمالك المنصة فقط' using errcode = '42501';
  end if;
  update public.offices set slug = nullif(lower(btrim(_slug)), '') where id = _office;
end;
$$;

revoke all on function public.platform_offices() from public, anon;
revoke all on function public.platform_set_office_active(uuid, boolean) from public, anon;
revoke all on function public.platform_set_office_slug(uuid, text) from public, anon;
grant execute on function public.platform_offices() to authenticated;
grant execute on function public.platform_set_office_active(uuid, boolean) to authenticated;
grant execute on function public.platform_set_office_slug(uuid, text) to authenticated;

-- الاسم والشعار لصفحة الدخول حين يُفتح النظام من رابط المكتب الفرعي
create or replace function public.office_public_info(_slug text)
returns jsonb
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select jsonb_build_object('id', o.id, 'name', s.office_name, 'logo', s.office_logo_url)
    from public.offices o
    join public.settings s on s.office_id = o.id
   where o.slug = lower(btrim(_slug)) and o.is_active;
$$;

revoke all on function public.office_public_info(text) from public;
grant execute on function public.office_public_info(text) to anon, authenticated;

-- ============================================================
-- التخزين: ملفات كل مكتب في مجلد باسم معرّفه
-- ------------------------------------------------------------
-- المسار الجديد: <office_id>/... . الملفات القديمة (قبل تعدد
-- المكاتب) بلا مجلد مكتب، فهي للمكتب الأول.
-- ============================================================
create or replace function public.storage_object_office(_name text)
returns uuid
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  _first text := split_part(_name, '/', 1);
  _id uuid;
begin
  if _first ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     and position('/' in _name) > 0 then
    select id into _id from public.offices where id = _first::uuid;
    return _id;   -- null إن لم يكن مكتبًا ⇒ ممنوع
  end if;
  return (select id from public.offices where is_founding);
end;
$$;

grant execute on function public.storage_object_office(text) to anon, authenticated;

create policy office_isolation on storage.objects
  as restrictive
  for all
  to authenticated
  using (
    bucket_id not in ('documents', 'templates', 'branding')
    or public.storage_object_office(name) = (select public.current_office_id())
  )
  with check (
    bucket_id not in ('documents', 'templates', 'branding')
    or (split_part(name, '/', 1) = (select public.current_office_id())::text
        and public.storage_object_office(name) = (select public.current_office_id()))
  );

