-- ============================================================
-- الجلسات · المهام · المواعيد
-- ============================================================

create table public.hearings (
  id                 uuid primary key default gen_random_uuid(),
  case_id            uuid not null references public.cases(id) on delete cascade,
  court_id           uuid references public.courts(id) on delete set null,
  chamber_id         uuid references public.court_chambers(id) on delete set null,
  judge_id           uuid references public.judges(id) on delete set null,
  hearing_date       date not null,
  hearing_time       time,
  room               text,
  assigned_lawyer_id uuid references public.profiles(id) on delete set null,
  hearing_type       text not null default 'session',
  required_action    text,
  result             text,
  decision           text,
  notes              text,
  next_hearing_date  date,
  status             text not null default 'scheduled',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references public.profiles(id) on delete set null,
  updated_by         uuid references public.profiles(id) on delete set null,
  deleted_at         timestamptz,
  constraint hearings_type_valid check (hearing_type in (
    'session','pleading','evidence','expert','judgment','postponement','execution','other')),
  constraint hearings_status_valid check (status in ('scheduled','held','postponed','cancelled')),
  constraint hearings_next_after check (next_hearing_date is null or next_hearing_date >= hearing_date)
);

create index hearings_case_idx   on public.hearings (case_id)      where deleted_at is null;
create index hearings_date_idx   on public.hearings (hearing_date) where deleted_at is null;
create index hearings_lawyer_idx on public.hearings (assigned_lawyer_id);
create index hearings_status_idx on public.hearings (status);
create index hearings_court_idx  on public.hearings (court_id);

create trigger hearings_set_updated_at before update on public.hearings
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- المهام
-- ------------------------------------------------------------
create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  case_id      uuid references public.cases(id)   on delete cascade,
  client_id    uuid references public.clients(id) on delete cascade,
  assignee_id  uuid references public.profiles(id) on delete set null,
  due_date     date,
  priority     text not null default 'medium',
  status       text not null default 'new',
  notes        text,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references public.profiles(id) on delete set null,
  updated_by   uuid references public.profiles(id) on delete set null,
  deleted_at   timestamptz,
  constraint tasks_title_not_blank check (length(btrim(title)) > 0),
  constraint tasks_priority_valid check (priority in ('low','medium','high','urgent')),
  constraint tasks_status_valid   check (status in ('new','in_progress','completed','late','cancelled'))
);

create index tasks_case_idx     on public.tasks (case_id)     where deleted_at is null;
create index tasks_client_idx   on public.tasks (client_id)   where deleted_at is null;
create index tasks_assignee_idx on public.tasks (assignee_id) where deleted_at is null;
create index tasks_due_idx      on public.tasks (due_date)    where deleted_at is null;
create index tasks_status_idx   on public.tasks (status);

create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- المواعيد (اجتماعات العملاء والمواعيد النهائية)
-- ------------------------------------------------------------
create table public.appointments (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  client_id   uuid references public.clients(id) on delete cascade,
  case_id     uuid references public.cases(id)   on delete cascade,
  owner_id    uuid references public.profiles(id) on delete set null,
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  location    text,
  kind        text not null default 'meeting',
  status      text not null default 'scheduled',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references public.profiles(id) on delete set null,
  deleted_at  timestamptz,
  constraint appointments_title_not_blank check (length(btrim(title)) > 0),
  constraint appointments_kind_valid   check (kind in ('meeting','deadline','reminder','other')),
  constraint appointments_status_valid check (status in ('scheduled','done','cancelled')),
  constraint appointments_end_after    check (ends_at is null or ends_at >= starts_at)
);

create index appointments_starts_idx on public.appointments (starts_at) where deleted_at is null;
create index appointments_client_idx on public.appointments (client_id);
create index appointments_case_idx   on public.appointments (case_id);
create index appointments_owner_idx  on public.appointments (owner_id);

create trigger appointments_set_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();

-- تعليم المهام المتأخرة تلقائيًا عند القراءة
create or replace function public.mark_overdue_tasks()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _n integer;
begin
  update public.tasks
     set status = 'late'
   where deleted_at is null
     and status in ('new','in_progress')
     and due_date is not null
     and due_date < current_date;
  get diagnostics _n = row_count;
  return _n;
end;
$$;

grant execute on function public.mark_overdue_tasks() to authenticated;
;