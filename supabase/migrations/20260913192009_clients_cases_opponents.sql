-- ============================================================
-- العملاء · القضايا · الخصوم
-- ============================================================

-- مولّد أرقام تسلسلية آمن تحت التزامن
create table public.number_sequences (
  key        text primary key,
  last_value bigint not null default 0
);

create or replace function public.next_sequence_number(_key text, _prefix text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _n bigint;
begin
  insert into public.number_sequences (key, last_value)
  values (_key, 1)
  on conflict (key) do update set last_value = public.number_sequences.last_value + 1
  returning last_value into _n;

  return _prefix || '-' || to_char(now(), 'YYYY') || '-' || lpad(_n::text, 5, '0');
end;
$$;

-- ------------------------------------------------------------
-- العملاء
-- ------------------------------------------------------------
create table public.clients (
  id                    uuid primary key default gen_random_uuid(),
  client_no             text not null unique,
  name                  text not null,
  client_type           text not null default 'individual',
  national_id           text,
  phone                 text,
  whatsapp              text,
  email                 text,
  address               text,
  occupation            text,
  file_opened_at        date not null default current_date,
  responsible_lawyer_id uuid references public.profiles(id) on delete set null,
  status                text not null default 'active',
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references public.profiles(id) on delete set null,
  updated_by            uuid references public.profiles(id) on delete set null,
  deleted_at            timestamptz,
  constraint clients_name_not_blank check (length(btrim(name)) > 0),
  constraint clients_type_valid   check (client_type in ('individual','company','institution','legal_entity')),
  constraint clients_status_valid check (status in ('active','inactive','blocked')),
  constraint clients_email_valid  check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create index clients_status_idx  on public.clients (status) where deleted_at is null;
create index clients_lawyer_idx  on public.clients (responsible_lawyer_id);
create index clients_type_idx    on public.clients (client_type);
create index clients_name_trgm   on public.clients using gin (name gin_trgm_ops);
create index clients_phone_idx   on public.clients (phone);
create index clients_no_idx      on public.clients (client_no);

create trigger clients_set_updated_at before update on public.clients
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- القضايا
-- ------------------------------------------------------------
create table public.cases (
  id                    uuid primary key default gen_random_uuid(),
  internal_no           text not null unique,
  court_case_no         text,
  title                 text not null,
  client_id             uuid not null references public.clients(id) on delete restrict,
  responsible_lawyer_id uuid references public.profiles(id) on delete set null,
  assistant_lawyer_id   uuid references public.profiles(id) on delete set null,
  case_type_id          uuid references public.case_types(id) on delete set null,
  court_id              uuid references public.courts(id) on delete set null,
  chamber_id            uuid references public.court_chambers(id) on delete set null,
  judge_id              uuid references public.judges(id) on delete set null,
  governorate           text,
  registered_at         date,
  first_hearing_at      date,
  litigation_degree     text,
  claim_amount          numeric(14,2),
  priority              text not null default 'medium',
  status                text not null default 'new',
  description           text,
  notes                 text,
  closed_at             timestamptz,
  close_reason          text,
  archived_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references public.profiles(id) on delete set null,
  updated_by            uuid references public.profiles(id) on delete set null,
  deleted_at            timestamptz,
  constraint cases_title_not_blank check (length(btrim(title)) > 0),
  constraint cases_priority_valid  check (priority in ('low','medium','high','urgent')),
  constraint cases_status_valid    check (status in (
    'new','in_progress','awaiting_hearing','awaiting_decision',
    'appeal','cassation','execution','settlement','closed','archived')),
  constraint cases_degree_valid    check (litigation_degree is null or litigation_degree in (
    'first_instance','appeal','cassation','execution')),
  constraint cases_claim_positive  check (claim_amount is null or claim_amount >= 0)
);

create index cases_client_idx    on public.cases (client_id)             where deleted_at is null;
create index cases_lawyer_idx    on public.cases (responsible_lawyer_id) where deleted_at is null;
create index cases_assistant_idx on public.cases (assistant_lawyer_id)   where deleted_at is null;
create index cases_status_idx    on public.cases (status)                where deleted_at is null;
create index cases_type_idx      on public.cases (case_type_id);
create index cases_court_idx     on public.cases (court_id);
create index cases_priority_idx  on public.cases (priority);
create index cases_title_trgm    on public.cases using gin (title gin_trgm_ops);
create index cases_internal_no_idx on public.cases (internal_no);
create index cases_court_case_no_idx on public.cases (court_case_no);

create trigger cases_set_updated_at before update on public.cases
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- الخصوم — القضية قد تحتوي أكثر من خصم
-- ------------------------------------------------------------
create table public.opponents (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references public.cases(id) on delete cascade,
  name          text not null,
  national_id   text,
  phone         text,
  address       text,
  lawyer_name   text,
  lawyer_phone  text,
  contact_info  text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint opponents_name_not_blank check (length(btrim(name)) > 0)
);

create index opponents_case_idx on public.opponents (case_id);

create trigger opponents_set_updated_at before update on public.opponents
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- ملاحظات القضية + تاريخ تغيّر الحالة
-- ------------------------------------------------------------
create table public.case_notes (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid not null references public.cases(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  constraint case_notes_body_not_blank check (length(btrim(body)) > 0)
);
create index case_notes_case_idx on public.case_notes (case_id, created_at desc);

create table public.case_status_history (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references public.cases(id) on delete cascade,
  from_status text,
  to_status   text not null,
  reason      text,
  changed_at  timestamptz not null default now(),
  changed_by  uuid references public.profiles(id) on delete set null
);
create index case_status_history_case_idx on public.case_status_history (case_id, changed_at desc);

-- تسجيل تغيّر حالة القضية تلقائيًا
create or replace function public.log_case_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status is distinct from old.status then
    insert into public.case_status_history (case_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger cases_log_status_change
  after update of status on public.cases
  for each row execute function public.log_case_status_change();
;