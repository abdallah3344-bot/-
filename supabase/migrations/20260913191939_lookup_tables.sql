-- ============================================================
-- جداول المراجع — قابلة للإضافة والتعديل من الإعدادات
-- ============================================================

-- أنواع القضايا
create table public.case_types (
  id         uuid primary key default gen_random_uuid(),
  name_ar    text not null unique,
  color      text not null default '#0F1E3D',
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- المحاكم
create table public.courts (
  id           uuid primary key default gen_random_uuid(),
  name_ar      text not null,
  court_type   text,
  governorate  text,
  address      text,
  phone        text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint courts_name_governorate_unique unique (name_ar, governorate)
);

-- دوائر المحاكم
create table public.court_chambers (
  id         uuid primary key default gen_random_uuid(),
  court_id   uuid not null references public.courts(id) on delete cascade,
  name_ar    text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint court_chambers_unique unique (court_id, name_ar)
);
create index court_chambers_court_idx on public.court_chambers (court_id);

-- القضاة
create table public.judges (
  id         uuid primary key default gen_random_uuid(),
  full_name  text not null,
  court_id   uuid references public.courts(id) on delete set null,
  title      text,
  phone      text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index judges_court_idx on public.judges (court_id);

-- تصنيفات المستندات
create table public.document_categories (
  id         uuid primary key default gen_random_uuid(),
  name_ar    text not null unique,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- تصنيفات المصروفات
create table public.expense_categories (
  id         uuid primary key default gen_random_uuid(),
  name_ar    text not null unique,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger case_types_set_updated_at before update on public.case_types
  for each row execute function public.set_updated_at();
create trigger courts_set_updated_at before update on public.courts
  for each row execute function public.set_updated_at();
create trigger court_chambers_set_updated_at before update on public.court_chambers
  for each row execute function public.set_updated_at();
create trigger judges_set_updated_at before update on public.judges
  for each row execute function public.set_updated_at();
create trigger document_categories_set_updated_at before update on public.document_categories
  for each row execute function public.set_updated_at();
create trigger expense_categories_set_updated_at before update on public.expense_categories
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- البيانات الافتراضية
-- ------------------------------------------------------------
insert into public.case_types (name_ar, color, sort_order) values
  ('مدنية','#1E40AF',1), ('جزائية','#B91C1C',2), ('تجارية','#047857',3),
  ('عمالية','#B45309',4), ('شرعية','#6D28D9',5), ('أحوال شخصية','#BE185D',6),
  ('عقارية','#0F766E',7), ('تنفيذ','#4338CA',8), ('إدارية','#475569',9),
  ('ضريبية','#0E7490',10), ('شركات','#7C2D12',11), ('تأمين','#065F46',12),
  ('بنكية','#1D4ED8',13), ('أسرية','#9D174D',14);

insert into public.document_categories (name_ar, sort_order) values
  ('وكالة',1), ('لائحة',2), ('مذكرة',3), ('حكم',4), ('تبليغ',5), ('عقد',6),
  ('هوية',7), ('مراسلة',8), ('مستند مقدم',9), ('مستند مستلم',10), ('مستندات أخرى',11);

insert into public.expense_categories (name_ar, sort_order) values
  ('رسوم محكمة',1), ('تبليغات',2), ('طوابع',3), ('مواصلات',4),
  ('خبرة',5), ('ترجمة',6), ('تصوير',7), ('مصروفات أخرى',8);
;