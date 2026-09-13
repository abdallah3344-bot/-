-- ============================================================
-- إعدادات المكتب (صف واحد) + سجل العمليات
-- ============================================================

create table public.settings (
  id                  boolean primary key default true,
  office_name         text not null default 'مكتب المحاماة',
  office_logo_url     text,
  office_address      text,
  office_phone        text,
  office_email        text,
  office_website      text,
  tax_number          text,
  currency_code       text not null default 'SAR',
  currency_symbol     text not null default 'ر.س',
  tax_enabled         boolean not null default false,
  tax_rate            numeric(5,2) not null default 15.00,
  invoice_prefix      text not null default 'INV',
  receipt_prefix      text not null default 'REC',
  client_prefix       text not null default 'CL',
  case_prefix         text not null default 'CS',
  invoice_notes       text,
  bank_name           text,
  bank_account_name   text,
  bank_account_number text,
  bank_iban           text,
  backup_frequency    text not null default 'daily',
  updated_at          timestamptz not null default now(),
  updated_by          uuid references public.profiles(id) on delete set null,
  constraint settings_singleton check (id = true),
  constraint settings_tax_rate_range check (tax_rate >= 0 and tax_rate <= 100),
  constraint settings_backup_frequency_valid check (backup_frequency in ('daily','weekly','monthly','off'))
);

create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

insert into public.settings (id) values (true);

-- ------------------------------------------------------------
-- سجل العمليات
-- ------------------------------------------------------------
create table public.audit_logs (
  id           bigint generated always as identity primary key,
  user_id      uuid references public.profiles(id) on delete set null,
  user_name    text,
  action       text not null,
  entity       text not null,
  entity_id    text,
  entity_label text,
  summary      text,
  changes      jsonb,
  ip_address   text,
  user_agent   text,
  created_at   timestamptz not null default now(),
  constraint audit_logs_action_valid check (
    action in ('login','logout','login_failed','create','update','delete','restore',
               'upload','download','print','export','permission_change','password_change',
               'approve','close','reopen','backup','restore_backup')
  )
);

create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_user_idx    on public.audit_logs (user_id, created_at desc);
create index audit_logs_entity_idx  on public.audit_logs (entity, entity_id);
create index audit_logs_action_idx  on public.audit_logs (action);

-- كتابة سجل العملية — تُستدعى من الخادم
create or replace function public.write_audit_log(
  _action       text,
  _entity       text,
  _entity_id    text default null,
  _entity_label text default null,
  _summary      text default null,
  _changes      jsonb default null,
  _ip           text default null,
  _user_agent   text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _uid  uuid := auth.uid();
  _name text;
begin
  select full_name into _name from public.profiles where id = _uid;

  insert into public.audit_logs (
    user_id, user_name, action, entity, entity_id,
    entity_label, summary, changes, ip_address, user_agent
  )
  values (
    _uid, coalesce(_name, 'غير معروف'), _action, _entity, _entity_id,
    _entity_label, _summary, _changes, _ip, _user_agent
  );
end;
$$;

grant execute on function public.write_audit_log(text,text,text,text,text,jsonb,text,text) to authenticated;
;