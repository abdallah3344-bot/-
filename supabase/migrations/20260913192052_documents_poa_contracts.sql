-- ============================================================
-- المستندات · الوكالات · العقود
-- ============================================================

create table public.documents (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  category_id   uuid references public.document_categories(id) on delete set null,
  case_id       uuid references public.cases(id)   on delete cascade,
  client_id     uuid references public.clients(id) on delete cascade,
  storage_path  text not null unique,
  mime_type     text,
  size_bytes    bigint,
  doc_date      date,
  description   text,
  -- تجهيز OCR / الذكاء الاصطناعي (المرحلة 12)
  ocr_status    text not null default 'pending',
  ocr_text      text,
  ocr_extracted jsonb,
  ocr_reviewed_at timestamptz,
  ocr_reviewed_by uuid references public.profiles(id) on delete set null,
  uploaded_by   uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  constraint documents_name_not_blank check (length(btrim(name)) > 0),
  constraint documents_size_positive  check (size_bytes is null or size_bytes >= 0),
  constraint documents_ocr_status_valid check (ocr_status in ('pending','processing','done','failed','skipped'))
);

create index documents_case_idx     on public.documents (case_id)     where deleted_at is null;
create index documents_client_idx   on public.documents (client_id)   where deleted_at is null;
create index documents_category_idx on public.documents (category_id);
create index documents_name_trgm    on public.documents using gin (name gin_trgm_ops);
create index documents_ocr_status_idx on public.documents (ocr_status);

create trigger documents_set_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- الوكالات
-- ------------------------------------------------------------
create table public.powers_of_attorney (
  id          uuid primary key default gen_random_uuid(),
  poa_no      text not null unique,
  client_id   uuid not null references public.clients(id) on delete restrict,
  case_id     uuid references public.cases(id) on delete set null,
  poa_type    text not null default 'general',
  issued_at   date not null,
  expires_at  date,
  lawyer_id   uuid references public.profiles(id) on delete set null,
  status      text not null default 'active',
  document_id uuid references public.documents(id) on delete set null,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references public.profiles(id) on delete set null,
  deleted_at  timestamptz,
  constraint poa_type_valid   check (poa_type in ('general','specific','litigation','execution','other')),
  constraint poa_status_valid check (status in ('active','expired','revoked')),
  constraint poa_expiry_after check (expires_at is null or expires_at >= issued_at)
);

create index poa_client_idx  on public.powers_of_attorney (client_id) where deleted_at is null;
create index poa_case_idx    on public.powers_of_attorney (case_id);
create index poa_expires_idx on public.powers_of_attorney (expires_at) where deleted_at is null;
create index poa_status_idx  on public.powers_of_attorney (status);

create trigger poa_set_updated_at before update on public.powers_of_attorney
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- العقود
-- ------------------------------------------------------------
create table public.contracts (
  id            uuid primary key default gen_random_uuid(),
  contract_no   text not null unique,
  title         text not null,
  client_id     uuid not null references public.clients(id) on delete restrict,
  counterparty  text,
  contract_type text,
  start_date    date,
  end_date      date,
  value         numeric(14,2),
  lawyer_id     uuid references public.profiles(id) on delete set null,
  status        text not null default 'active',
  document_id   uuid references public.documents(id) on delete set null,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references public.profiles(id) on delete set null,
  deleted_at    timestamptz,
  constraint contracts_title_not_blank check (length(btrim(title)) > 0),
  constraint contracts_status_valid check (status in ('draft','active','expired','terminated','completed')),
  constraint contracts_value_positive check (value is null or value >= 0),
  constraint contracts_end_after check (end_date is null or start_date is null or end_date >= start_date)
);

create index contracts_client_idx on public.contracts (client_id) where deleted_at is null;
create index contracts_end_idx    on public.contracts (end_date)  where deleted_at is null;
create index contracts_status_idx on public.contracts (status);
create index contracts_title_trgm on public.contracts using gin (title gin_trgm_ops);

create trigger contracts_set_updated_at before update on public.contracts
  for each row execute function public.set_updated_at();
;