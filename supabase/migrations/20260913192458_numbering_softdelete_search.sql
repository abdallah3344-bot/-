-- ============================================================
-- ترقيم تلقائي · حذف ناعم · بحث موحّد · إحصاءات لوحة التحكم
-- ============================================================

-- ------------------------------------------------------------
-- 1) الترقيم التلقائي — يملأ الرقم التسلسلي إن تُرك فارغًا
-- ------------------------------------------------------------
create or replace function public.assign_client_no()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare _p text;
begin
  if new.client_no is null or btrim(new.client_no) = '' then
    select client_prefix into _p from public.settings where id;
    new.client_no := public.next_sequence_number('clients', coalesce(_p,'CL'));
  end if;
  return new;
end $$;

create or replace function public.assign_case_no()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare _p text;
begin
  if new.internal_no is null or btrim(new.internal_no) = '' then
    select case_prefix into _p from public.settings where id;
    new.internal_no := public.next_sequence_number('cases', coalesce(_p,'CS'));
  end if;
  return new;
end $$;

create or replace function public.assign_invoice_no()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare _p text;
begin
  if new.invoice_no is null or btrim(new.invoice_no) = '' then
    select invoice_prefix into _p from public.settings where id;
    new.invoice_no := public.next_sequence_number('invoices', coalesce(_p,'INV'));
  end if;
  return new;
end $$;

create or replace function public.assign_receipt_no()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare _p text;
begin
  if new.receipt_no is null or btrim(new.receipt_no) = '' then
    select receipt_prefix into _p from public.settings where id;
    new.receipt_no := public.next_sequence_number('payments', coalesce(_p,'REC'));
  end if;
  return new;
end $$;

create or replace function public.assign_poa_no()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.poa_no is null or btrim(new.poa_no) = '' then
    new.poa_no := public.next_sequence_number('poa', 'POA');
  end if;
  return new;
end $$;

create or replace function public.assign_contract_no()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.contract_no is null or btrim(new.contract_no) = '' then
    new.contract_no := public.next_sequence_number('contracts', 'CNT');
  end if;
  return new;
end $$;

create or replace function public.assign_correspondence_no()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.reference_no is null or btrim(new.reference_no) = '' then
    new.reference_no := public.next_sequence_number(
      'correspondence_' || new.direction,
      case when new.direction = 'outgoing' then 'OUT' else 'IN' end);
  end if;
  return new;
end $$;

create trigger clients_assign_no        before insert on public.clients            for each row execute function public.assign_client_no();
create trigger cases_assign_no          before insert on public.cases              for each row execute function public.assign_case_no();
create trigger invoices_assign_no       before insert on public.invoices           for each row execute function public.assign_invoice_no();
create trigger payments_assign_no       before insert on public.payments           for each row execute function public.assign_receipt_no();
create trigger poa_assign_no            before insert on public.powers_of_attorney for each row execute function public.assign_poa_no();
create trigger contracts_assign_no      before insert on public.contracts          for each row execute function public.assign_contract_no();
create trigger correspondence_assign_no before insert on public.correspondence     for each row execute function public.assign_correspondence_no();

revoke execute on function public.assign_client_no(), public.assign_case_no(),
  public.assign_invoice_no(), public.assign_receipt_no(), public.assign_poa_no(),
  public.assign_contract_no(), public.assign_correspondence_no()
  from anon, authenticated, public;

-- ------------------------------------------------------------
-- 2) الحذف الناعم — يتطلب صلاحية delete للوحدة المعنية
-- ------------------------------------------------------------
create or replace function public.soft_delete(_entity text, _id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

  execute format('update public.%I set deleted_at = now() where id = $1 and deleted_at is null', _entity)
    using _id;

  perform public.write_audit_log('delete', _entity, _id::text, _label, 'حذف ناعم');
end;
$$;

grant execute on function public.soft_delete(text, uuid) to authenticated;
revoke execute on function public.soft_delete(text, uuid) from anon, public;

-- استعادة سجل محذوف
create or replace function public.restore_record(_entity text, _id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.has_perm('archive', 'approve') then
    raise exception 'ليس لديك صلاحية الاستعادة' using errcode = '42501';
  end if;

  if _entity !~ '^[a-z_]+$' then
    raise exception 'كيان غير صالح' using errcode = '22023';
  end if;

  execute format('update public.%I set deleted_at = null where id = $1', _entity) using _id;
  perform public.write_audit_log('restore', _entity, _id::text, null, 'استعادة سجل محذوف');
end;
$$;

grant execute on function public.restore_record(text, uuid) to authenticated;
revoke execute on function public.restore_record(text, uuid) from anon, public;

-- ------------------------------------------------------------
-- 3) البحث الموحّد — نتائج مصنّفة حسب النوع، تحترم RLS
--    SECURITY INVOKER عمدًا: الاستعلامات تمرّ بسياسات المستخدم نفسه
-- ------------------------------------------------------------
create or replace function public.global_search(q text, max_per_type integer default 5)
returns table (
  entity_type text,
  id          uuid,
  title       text,
  subtitle    text,
  extra       text
)
language sql
stable
security invoker
set search_path = public, extensions, pg_temp
as $$
  with needle as (select '%' || btrim(q) || '%' as p)
  (select 'client', c.id, c.name, c.client_no, c.phone
     from public.clients c, needle
    where c.name ilike needle.p or c.client_no ilike needle.p
       or c.phone ilike needle.p or c.national_id ilike needle.p
    limit max_per_type)
  union all
  (select 'case', cs.id, cs.title, cs.internal_no, cs.court_case_no
     from public.cases cs, needle
    where cs.title ilike needle.p or cs.internal_no ilike needle.p
       or cs.court_case_no ilike needle.p
    limit max_per_type)
  union all
  (select 'hearing', h.id, c.title, h.hearing_date::text, h.room
     from public.hearings h join public.cases c on c.id = h.case_id, needle
    where c.title ilike needle.p or h.room ilike needle.p or c.court_case_no ilike needle.p
    limit max_per_type)
  union all
  (select 'court', ct.id, ct.name_ar, ct.governorate, ct.court_type
     from public.courts ct, needle
    where ct.name_ar ilike needle.p
    limit max_per_type)
  union all
  (select 'document', d.id, d.name, d.description, d.mime_type
     from public.documents d, needle
    where d.name ilike needle.p or d.description ilike needle.p
    limit max_per_type)
  union all
  (select 'contract', ct.id, ct.title, ct.contract_no, ct.counterparty
     from public.contracts ct, needle
    where ct.title ilike needle.p or ct.contract_no ilike needle.p
    limit max_per_type)
  union all
  (select 'poa', p.id, p.poa_no, p.poa_type, p.status
     from public.powers_of_attorney p, needle
    where p.poa_no ilike needle.p
    limit max_per_type)
  union all
  (select 'invoice', i.id, i.invoice_no, i.total::text, i.status
     from public.invoices i, needle
    where i.invoice_no ilike needle.p
    limit max_per_type)
  union all
  (select 'payment', pm.id, pm.receipt_no, pm.amount::text, pm.method
     from public.payments pm, needle
    where pm.receipt_no ilike needle.p
    limit max_per_type);
$$;

grant execute on function public.global_search(text, integer) to authenticated;
revoke execute on function public.global_search(text, integer) from anon, public;

-- ------------------------------------------------------------
-- 4) إحصاءات لوحة التحكم — استعلام واحد بدل عشرة
-- ------------------------------------------------------------
create or replace function public.dashboard_stats()
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'clients_total',    (select count(*) from public.clients),
    'clients_active',   (select count(*) from public.clients where status = 'active'),
    'cases_total',      (select count(*) from public.cases),
    'cases_open',       (select count(*) from public.cases where status not in ('closed','archived')),
    'cases_closed',     (select count(*) from public.cases where status in ('closed','archived')),
    'hearings_today',   (select count(*) from public.hearings where hearing_date = current_date and status = 'scheduled'),
    'hearings_upcoming',(select count(*) from public.hearings where hearing_date > current_date and status = 'scheduled'),
    'tasks_late',       (select count(*) from public.tasks where status <> 'completed' and due_date < current_date),
    'tasks_open',       (select count(*) from public.tasks where status in ('new','in_progress')),
    'appointments_upcoming', (select count(*) from public.appointments where starts_at >= now() and status = 'scheduled'),
    'fees_total',       (select coalesce(sum(total_amount),0) from public.case_fees),
    'payments_total',   (select coalesce(sum(amount),0) from public.payments),
    'expenses_total',   (select coalesce(sum(amount),0) from public.expenses),
    'receivables',      (select coalesce(sum(total - paid_amount),0) from public.invoices
                          where status not in ('cancelled','draft')),
    'net_revenue',      (select coalesce((select sum(amount) from public.payments),0)
                              - coalesce((select sum(amount) from public.expenses),0))
  );
$$;

grant execute on function public.dashboard_stats() to authenticated;
revoke execute on function public.dashboard_stats() from anon, public;

-- توزيع القضايا للرسوم البيانية
create or replace function public.case_distribution()
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'by_type', (
      select coalesce(jsonb_agg(jsonb_build_object('label', t.name_ar, 'value', x.n, 'color', t.color) order by x.n desc), '[]'::jsonb)
      from (select case_type_id, count(*) n from public.cases group by case_type_id) x
      join public.case_types t on t.id = x.case_type_id
    ),
    'by_court', (
      select coalesce(jsonb_agg(jsonb_build_object('label', ct.name_ar, 'value', x.n) order by x.n desc), '[]'::jsonb)
      from (select court_id, count(*) n from public.cases where court_id is not null group by court_id) x
      join public.courts ct on ct.id = x.court_id
    ),
    'by_status', (
      select coalesce(jsonb_agg(jsonb_build_object('label', status, 'value', n) order by n desc), '[]'::jsonb)
      from (select status, count(*) n from public.cases group by status) s
    ),
    'hearings_monthly', (
      select coalesce(jsonb_agg(jsonb_build_object('label', to_char(m, 'YYYY-MM'), 'value', n) order by m), '[]'::jsonb)
      from (
        select date_trunc('month', hearing_date)::date m, count(*) n
        from public.hearings
        where hearing_date >= (current_date - interval '11 months')
        group by 1
      ) h
    ),
    'finance_monthly', (
      select coalesce(jsonb_agg(jsonb_build_object('label', to_char(m,'YYYY-MM'), 'income', inc, 'expense', exp) order by m), '[]'::jsonb)
      from (
        select m,
               coalesce(sum(inc),0) inc,
               coalesce(sum(exp),0) exp
        from (
          select date_trunc('month', paid_at)::date m, amount inc, 0 exp from public.payments
          union all
          select date_trunc('month', spent_at)::date m, 0 inc, amount exp from public.expenses
        ) u
        where m >= (date_trunc('month', current_date) - interval '11 months')::date
        group by m
      ) f
    )
  );
$$;

grant execute on function public.case_distribution() to authenticated;
revoke execute on function public.case_distribution() from anon, public;
;