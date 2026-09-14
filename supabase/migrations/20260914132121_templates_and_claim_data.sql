-- ============================================================
-- قوالب المستندات + بيانات لائحة الدعوى
-- ============================================================

-- ------------------------------------------------------------
-- 1) البيانات التي يوجبها القانون في لائحة الدعوى
--    (قانون أصول المحاكمات المدنية والتجارية رقم 2 لسنة 2001،
--     المادة 52 — يُراجع النص النافذ بعد تعديلات 2024)
--    أُضيفت كحقول مستقلة لا كنصّ حر حتى يمكن فحص اكتمالها آليًا.
-- ------------------------------------------------------------
alter table public.cases
  add column if not exists claim_requests       text,
  add column if not exists claim_arose_at       date,
  add column if not exists property_description text;

comment on column public.cases.claim_requests is
  'طلبات المدعي كما تُذكر في لائحة الدعوى.';
comment on column public.cases.claim_arose_at is
  'تاريخ نشوء الادعاء.';
comment on column public.cases.property_description is
  'وصف العقار أو المنقول إن كان موضوع الدعوى عينًا معيّنة.';

alter table public.clients
  add column if not exists workplace      text,
  add column if not exists legal_capacity text;

comment on column public.clients.legal_capacity is
  'الأهلية: كاملة أو ناقصة أو معدومة ومن يمثله — يوجب القانون بيانها عند النقص.';

alter table public.opponents
  add column if not exists occupation     text,
  add column if not exists workplace      text,
  add column if not exists legal_capacity text;

-- ------------------------------------------------------------
-- 2) قوالب المستندات
--    القوالب ملك المكتب: يرفع ما يستعمله فعلًا. النظام يملأ
--    حقول الدمج من بيانات القضية ولا يؤلّف نصًّا قانونيًا.
-- ------------------------------------------------------------
create table if not exists public.document_templates (
  id           uuid primary key default gen_random_uuid(),
  name         text        not null,
  description  text,
  scope        text        not null default 'case'
                 check (scope in ('case', 'client', 'general')),
  category_id  uuid        references public.document_categories(id) on delete set null,
  body         text,
  file_path    text,
  file_name    text,
  is_active    boolean     not null default true,
  sort_order   integer     not null default 100,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid        references public.profiles(id) on delete set null,
  updated_by   uuid        references public.profiles(id) on delete set null,
  deleted_at   timestamptz,
  constraint document_templates_has_content
    check (coalesce(nullif(btrim(body), ''), file_path) is not null)
);

create index if not exists document_templates_active_idx
  on public.document_templates (scope, sort_order)
  where deleted_at is null and is_active;

drop trigger if exists document_templates_touch on public.document_templates;
create trigger document_templates_touch
  before update on public.document_templates
  for each row execute function public.set_updated_at();

alter table public.document_templates enable row level security;

drop policy if exists document_templates_select on public.document_templates;
create policy document_templates_select on public.document_templates
  for select to authenticated using (public.has_perm('documents','view'));

drop policy if exists document_templates_insert on public.document_templates;
create policy document_templates_insert on public.document_templates
  for insert to authenticated with check (public.has_perm('settings','update'));

drop policy if exists document_templates_update on public.document_templates;
create policy document_templates_update on public.document_templates
  for update to authenticated
  using (public.has_perm('settings','update'))
  with check (public.has_perm('settings','update'));

drop policy if exists document_templates_delete on public.document_templates;
create policy document_templates_delete on public.document_templates
  for delete to authenticated using (public.has_perm('settings','update'));

-- ------------------------------------------------------------
-- 3) حاوية ملفات القوالب — خاصة مثل المستندات
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'templates', 'templates', false, 10485760,
  array[
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ]
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists templates_read   on storage.objects;
drop policy if exists templates_write  on storage.objects;
drop policy if exists templates_delete on storage.objects;

create policy templates_read on storage.objects
  for select to authenticated
  using (bucket_id = 'templates' and public.has_perm('documents','view'));

create policy templates_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'templates' and public.has_perm('settings','update'));

create policy templates_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'templates' and public.has_perm('settings','update'));;
