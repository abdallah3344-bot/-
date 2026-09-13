-- ============================================================
-- الأتعاب · الفواتير · المقبوضات · المصروفات · الحسابات
-- كل المبالغ numeric(14,2) — لا أعداد عشرية عائمة في المال
-- ============================================================

-- أتعاب القضية
create table public.case_fees (
  id                 uuid primary key default gen_random_uuid(),
  case_id            uuid not null unique references public.cases(id) on delete cascade,
  total_amount       numeric(14,2) not null default 0,
  advance_amount     numeric(14,2) not null default 0,
  installments_count integer not null default 0,
  installment_amount numeric(14,2) not null default 0,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references public.profiles(id) on delete set null,
  constraint case_fees_amounts_positive check (
    total_amount >= 0 and advance_amount >= 0 and installment_amount >= 0
  ),
  constraint case_fees_installments_positive check (installments_count >= 0),
  constraint case_fees_advance_within_total check (advance_amount <= total_amount)
);

create trigger case_fees_set_updated_at before update on public.case_fees
  for each row execute function public.set_updated_at();

-- أقساط الأتعاب
create table public.fee_installments (
  id          uuid primary key default gen_random_uuid(),
  case_fee_id uuid not null references public.case_fees(id) on delete cascade,
  seq         integer not null,
  amount      numeric(14,2) not null,
  due_date    date not null,
  paid_amount numeric(14,2) not null default 0,
  status      text not null default 'pending',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint fee_installments_seq_unique unique (case_fee_id, seq),
  constraint fee_installments_amount_positive check (amount >= 0 and paid_amount >= 0),
  constraint fee_installments_status_valid check (status in ('pending','partial','paid','overdue'))
);

create index fee_installments_fee_idx on public.fee_installments (case_fee_id);
create index fee_installments_due_idx on public.fee_installments (due_date, status);

create trigger fee_installments_set_updated_at before update on public.fee_installments
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- الفواتير
-- ------------------------------------------------------------
create table public.invoices (
  id          uuid primary key default gen_random_uuid(),
  invoice_no  text not null unique,
  client_id   uuid not null references public.clients(id) on delete restrict,
  case_id     uuid references public.cases(id) on delete set null,
  issue_date  date not null default current_date,
  due_date    date,
  subtotal    numeric(14,2) not null default 0,
  discount    numeric(14,2) not null default 0,
  tax_rate    numeric(5,2)  not null default 0,
  tax_amount  numeric(14,2) not null default 0,
  total       numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  status      text not null default 'draft',
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references public.profiles(id) on delete set null,
  deleted_at  timestamptz,
  constraint invoices_amounts_positive check (
    subtotal >= 0 and discount >= 0 and tax_amount >= 0 and total >= 0 and paid_amount >= 0
  ),
  constraint invoices_tax_rate_range check (tax_rate >= 0 and tax_rate <= 100),
  constraint invoices_discount_within check (discount <= subtotal),
  constraint invoices_status_valid check (status in ('draft','issued','partial','paid','overdue','cancelled')),
  constraint invoices_due_after check (due_date is null or due_date >= issue_date)
);

create index invoices_client_idx on public.invoices (client_id) where deleted_at is null;
create index invoices_case_idx   on public.invoices (case_id)   where deleted_at is null;
create index invoices_status_idx on public.invoices (status);
create index invoices_issue_idx  on public.invoices (issue_date desc);

create trigger invoices_set_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

-- بنود الفاتورة
create table public.invoice_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity    numeric(10,2) not null default 1,
  unit_price  numeric(14,2) not null default 0,
  line_total  numeric(14,2) not null default 0,
  sort_order  integer not null default 0,
  constraint invoice_items_desc_not_blank check (length(btrim(description)) > 0),
  constraint invoice_items_positive check (quantity > 0 and unit_price >= 0 and line_total >= 0)
);

create index invoice_items_invoice_idx on public.invoice_items (invoice_id, sort_order);

-- ------------------------------------------------------------
-- الحسابات (الصندوق والبنوك)
-- ------------------------------------------------------------
create table public.accounts (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  account_type    text not null default 'cash',
  bank_name       text,
  account_number  text,
  iban            text,
  opening_balance numeric(14,2) not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  constraint accounts_name_not_blank check (length(btrim(name)) > 0),
  constraint accounts_type_valid check (account_type in ('cash','bank'))
);

create trigger accounts_set_updated_at before update on public.accounts
  for each row execute function public.set_updated_at();

insert into public.accounts (name, account_type, opening_balance)
values ('الصندوق النقدي', 'cash', 0);

-- ------------------------------------------------------------
-- المقبوضات
-- ------------------------------------------------------------
create table public.payments (
  id           uuid primary key default gen_random_uuid(),
  receipt_no   text not null unique,
  client_id    uuid not null references public.clients(id) on delete restrict,
  case_id      uuid references public.cases(id)    on delete set null,
  invoice_id   uuid references public.invoices(id) on delete set null,
  installment_id uuid references public.fee_installments(id) on delete set null,
  account_id   uuid references public.accounts(id) on delete set null,
  amount       numeric(14,2) not null,
  method       text not null default 'cash',
  reference_no text,
  paid_at      date not null default current_date,
  received_by  uuid references public.profiles(id) on delete set null,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references public.profiles(id) on delete set null,
  deleted_at   timestamptz,
  constraint payments_amount_positive check (amount > 0),
  constraint payments_method_valid check (method in ('cash','cheque','bank_transfer','card','other'))
);

create index payments_client_idx  on public.payments (client_id)  where deleted_at is null;
create index payments_case_idx    on public.payments (case_id)    where deleted_at is null;
create index payments_invoice_idx on public.payments (invoice_id) where deleted_at is null;
create index payments_date_idx    on public.payments (paid_at desc);

create trigger payments_set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- المصروفات
-- ------------------------------------------------------------
create table public.expenses (
  id           uuid primary key default gen_random_uuid(),
  case_id      uuid references public.cases(id)   on delete cascade,
  client_id    uuid references public.clients(id) on delete cascade,
  category_id  uuid references public.expense_categories(id) on delete set null,
  account_id   uuid references public.accounts(id) on delete set null,
  amount       numeric(14,2) not null,
  spent_at     date not null default current_date,
  description  text,
  is_billable  boolean not null default true,
  is_reimbursed boolean not null default false,
  receipt_ref  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references public.profiles(id) on delete set null,
  deleted_at   timestamptz,
  constraint expenses_amount_positive check (amount > 0)
);

create index expenses_case_idx     on public.expenses (case_id)     where deleted_at is null;
create index expenses_client_idx   on public.expenses (client_id)   where deleted_at is null;
create index expenses_category_idx on public.expenses (category_id);
create index expenses_date_idx     on public.expenses (spent_at desc);

create trigger expenses_set_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- الحركات المالية — دفتر موحّد للصندوق والبنوك
-- ------------------------------------------------------------
create table public.transactions (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references public.accounts(id) on delete restrict,
  direction    text not null,
  amount       numeric(14,2) not null,
  occurred_at  date not null default current_date,
  description  text,
  source_table text,
  source_id    uuid,
  created_at   timestamptz not null default now(),
  created_by   uuid references public.profiles(id) on delete set null,
  constraint transactions_direction_valid check (direction in ('in','out')),
  constraint transactions_amount_positive check (amount > 0)
);

create index transactions_account_idx on public.transactions (account_id, occurred_at desc);
create index transactions_source_idx  on public.transactions (source_table, source_id);

-- ------------------------------------------------------------
-- إعادة احتساب حالة الفاتورة عند تغيّر الدفعات
-- ------------------------------------------------------------
create or replace function public.recalc_invoice_paid()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _invoice_id uuid := coalesce(new.invoice_id, old.invoice_id);
  _paid  numeric(14,2);
  _total numeric(14,2);
begin
  if _invoice_id is null then
    return coalesce(new, old);
  end if;

  select coalesce(sum(amount), 0) into _paid
    from public.payments
   where invoice_id = _invoice_id and deleted_at is null;

  select total into _total from public.invoices where id = _invoice_id;

  update public.invoices
     set paid_amount = _paid,
         status = case
           when status = 'cancelled' then 'cancelled'
           when status = 'draft'     then 'draft'
           when _paid >= _total and _total > 0 then 'paid'
           when _paid > 0            then 'partial'
           when due_date is not null and due_date < current_date then 'overdue'
           else 'issued'
         end
   where id = _invoice_id;

  return coalesce(new, old);
end;
$$;

create trigger payments_recalc_invoice
  after insert or update or delete on public.payments
  for each row execute function public.recalc_invoice_paid();

-- إعادة احتساب إجماليات الفاتورة عند تغيّر البنود
create or replace function public.recalc_invoice_totals()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _invoice_id uuid := coalesce(new.invoice_id, old.invoice_id);
  _subtotal numeric(14,2);
begin
  select coalesce(sum(line_total), 0) into _subtotal
    from public.invoice_items where invoice_id = _invoice_id;

  update public.invoices
     set subtotal   = _subtotal,
         tax_amount = round((_subtotal - discount) * tax_rate / 100, 2),
         total      = (_subtotal - discount) + round((_subtotal - discount) * tax_rate / 100, 2)
   where id = _invoice_id;

  return coalesce(new, old);
end;
$$;

create trigger invoice_items_recalc_totals
  after insert or update or delete on public.invoice_items
  for each row execute function public.recalc_invoice_totals();
;