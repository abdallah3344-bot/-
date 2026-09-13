-- ============================================================
-- المراسلات · التنبيهات
-- ============================================================

create table public.correspondence (
  id            uuid primary key default gen_random_uuid(),
  reference_no  text not null unique,
  direction     text not null,
  party_type    text not null default 'client',
  party_name    text not null,
  client_id     uuid references public.clients(id) on delete set null,
  case_id       uuid references public.cases(id)   on delete set null,
  subject       text not null,
  body          text,
  corr_date     date not null default current_date,
  owner_id      uuid references public.profiles(id) on delete set null,
  status        text not null default 'open',
  document_id   uuid references public.documents(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references public.profiles(id) on delete set null,
  deleted_at    timestamptz,
  constraint correspondence_subject_not_blank check (length(btrim(subject)) > 0),
  constraint correspondence_direction_valid check (direction in ('outgoing','incoming')),
  constraint correspondence_party_valid check (party_type in ('client','court','official','other')),
  constraint correspondence_status_valid check (status in ('open','in_progress','closed'))
);

create index correspondence_direction_idx on public.correspondence (direction) where deleted_at is null;
create index correspondence_client_idx    on public.correspondence (client_id);
create index correspondence_case_idx      on public.correspondence (case_id);
create index correspondence_date_idx      on public.correspondence (corr_date desc);
create index correspondence_subject_trgm  on public.correspondence using gin (subject gin_trgm_ops);

create trigger correspondence_set_updated_at before update on public.correspondence
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- التنبيهات
-- ------------------------------------------------------------
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  kind        text not null,
  title       text not null,
  body        text,
  entity      text,
  entity_id   uuid,
  link        text,
  severity    text not null default 'info',
  is_read     boolean not null default false,
  read_at     timestamptz,
  created_at  timestamptz not null default now(),
  constraint notifications_title_not_blank check (length(btrim(title)) > 0),
  constraint notifications_kind_valid check (kind in (
    'hearing_tomorrow','hearing_today','task_overdue','task_due',
    'installment_due','contract_expiring','poa_expiring','document_missing',
    'invoice_overdue','appointment','system')),
  constraint notifications_severity_valid check (severity in ('info','warning','danger','success'))
);

create index notifications_user_idx    on public.notifications (user_id, is_read, created_at desc);
create index notifications_created_idx on public.notifications (created_at desc);

-- إعدادات التنبيهات لكل مستخدم
create table public.notification_settings (
  user_id               uuid primary key references public.profiles(id) on delete cascade,
  hearing_reminder      boolean not null default true,
  hearing_days_before   integer not null default 1,
  task_reminder         boolean not null default true,
  installment_reminder  boolean not null default true,
  contract_reminder     boolean not null default true,
  contract_days_before  integer not null default 10,
  poa_reminder          boolean not null default true,
  poa_days_before       integer not null default 10,
  invoice_reminder      boolean not null default true,
  updated_at            timestamptz not null default now(),
  constraint notification_days_positive check (
    hearing_days_before >= 0 and contract_days_before >= 0 and poa_days_before >= 0
  )
);

create trigger notification_settings_set_updated_at before update on public.notification_settings
  for each row execute function public.set_updated_at();

-- إنشاء إعدادات تنبيهات افتراضية لكل ملف شخصي جديد
create or replace function public.create_default_notification_settings()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.notification_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger profiles_create_notification_settings
  after insert on public.profiles
  for each row execute function public.create_default_notification_settings();

insert into public.notification_settings (user_id)
select id from public.profiles
on conflict (user_id) do nothing;
;