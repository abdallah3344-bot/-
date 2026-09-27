-- سجل محاولات الدخول — تستخدمه resolve_login_email لحظر التخمين
create table if not exists public.login_attempts (
  id          bigserial primary key,
  identifier  text        not null,
  ip          text,
  success     boolean     not null default false,
  attempted_at timestamptz not null default now()
);

comment on table public.login_attempts is
  'سجل محاولات تسجيل الدخول — تستخدمه resolve_login_email لحظر التخمين. يُنظَّف تلقائياً بعد 30 يوماً.';

create index if not exists login_attempts_identifier_time_idx
  on public.login_attempts (lower(identifier), attempted_at desc);
create index if not exists login_attempts_time_idx
  on public.login_attempts (attempted_at);

alter table public.login_attempts enable row level security;
revoke all on public.login_attempts from anon, authenticated;
revoke all on sequence public.login_attempts_id_seq from anon, authenticated;
