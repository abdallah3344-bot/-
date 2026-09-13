-- ============================================================
-- نظام إدارة مكتب المحاماة — الأساس: الأدوار والصلاحيات والملفات
-- ============================================================

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ------------------------------------------------------------
-- دالة تحديث updated_at تلقائيًا
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- الأدوار
-- ------------------------------------------------------------
create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name_ar     text not null,
  description text,
  is_system   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint roles_code_format check (code ~ '^[a-z_]+$')
);

create trigger roles_set_updated_at
  before update on public.roles
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- الصلاحيات الذرّية:  module.action
-- ------------------------------------------------------------
create table public.permissions (
  id        uuid primary key default gen_random_uuid(),
  code      text not null unique,
  module    text not null,
  action    text not null,
  label_ar  text not null,
  constraint permissions_action_valid check (
    action in ('view','create','update','delete','print','export','download','approve')
  ),
  constraint permissions_code_matches check (code = module || '.' || action),
  constraint permissions_module_action_unique unique (module, action)
);

create index permissions_module_idx on public.permissions (module);

-- ------------------------------------------------------------
-- ربط دور ↔ صلاحية
-- ------------------------------------------------------------
create table public.role_permissions (
  role_id       uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create index role_permissions_permission_idx on public.role_permissions (permission_id);

-- ------------------------------------------------------------
-- الملف الشخصي (مرتبط بـ auth.users)
-- ------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null unique,
  full_name   text not null,
  email       text not null,
  phone       text,
  job_title   text,
  role_id     uuid not null references public.roles(id) on delete restrict,
  avatar_url  text,
  is_active   boolean not null default true,
  last_login_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  constraint profiles_username_format check (username ~ '^[a-zA-Z0-9._-]{3,40}$'),
  constraint profiles_full_name_not_blank check (length(btrim(full_name)) > 0)
);

create index profiles_role_idx      on public.profiles (role_id);
create index profiles_active_idx    on public.profiles (is_active) where deleted_at is null;
create index profiles_username_lower_idx on public.profiles (lower(username));
create index profiles_name_trgm_idx on public.profiles using gin (full_name gin_trgm_ops);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- تجاوزات الصلاحيات على مستوى المستخدم (للمستخدم المخصص)
--   granted = true  → تُضاف فوق صلاحيات الدور
--   granted = false → تُسحب رغم وجودها في الدور
-- ------------------------------------------------------------
create table public.user_permissions (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  granted       boolean not null,
  created_at    timestamptz not null default now(),
  primary key (user_id, permission_id)
);

create index user_permissions_permission_idx on public.user_permissions (permission_id);
;