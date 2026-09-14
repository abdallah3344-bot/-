-- ============================================================
-- بوابة الترخيص: ربط النظام بلوحة تراخيص المصري جروب
-- ------------------------------------------------------------
-- الجدول يحفظ *مدخلات* التحقق فقط (مفتاح الترخيص ومعرّف النسخة)
-- لا نتيجته. النتيجة تُحسب في الخادم بالاتصال بخادم التراخيص،
-- فلا يستطيع مستخدم مسجَّل تزوير حالة «مرخَّص» بالكتابة في جدول.
-- ============================================================

create table if not exists public.license_state (
  id                boolean primary key default true,
  program           text        not null default 'law-office',
  device_id         text        not null default gen_random_uuid()::text,
  license_key       text,
  client_name       text,
  phone             text,
  activated_at      timestamptz,
  activated_by      uuid references public.profiles(id) on delete set null,
  -- للتشخيص والعرض فقط — لا يُبنى عليه أي قرار سماح
  last_state        text,
  last_message      text,
  last_verified_at  timestamptz,
  updated_at        timestamptz not null default now(),
  constraint license_state_singleton check (id)
);

comment on table public.license_state is
  'صف واحد: مدخلات ترخيص هذه النسخة لدى لوحة تراخيص المصري جروب.';
comment on column public.license_state.device_id is
  '@generated معرّف ثابت لهذه النسخة من النظام — يُولَّد مرة واحدة ولا يتغيّر.';
comment on column public.license_state.last_state is
  'آخر حالة أرجعها خادم التراخيص — للعرض والتشخيص فقط.';

insert into public.license_state (id) values (true) on conflict (id) do nothing;

alter table public.license_state enable row level security;

-- يقرأها كل مستخدم مسجّل: شريط حالة الترخيص يظهر في كل صفحة.
drop policy if exists license_state_select on public.license_state;
create policy license_state_select on public.license_state
  for select to authenticated using (true);

-- التعديل لصاحب settings.update وحده — وهو من يُدخل مفتاح الترخيص.
drop policy if exists license_state_update on public.license_state;
create policy license_state_update on public.license_state
  for update to authenticated
  using (public.has_perm('settings','update'))
  with check (public.has_perm('settings','update'));

-- لا سياسة إدراج ولا حذف: الصف واحد ويبقى واحدًا.

create or replace function public.touch_license_state(
  p_state    text,
  p_message  text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- تسجيل آخر نتيجة تحقّق لأغراض العرض. متاحة لكل مستخدم مسجَّل
  -- لأنها لا تمنح وصولًا: قرار السماح يُتخذ من رد خادم التراخيص
  -- في كل طلب، لا من هذا الصف.
  update public.license_state
     set last_state       = p_state,
         last_message     = p_message,
         last_verified_at = now()
   where id;
end;
$$;

revoke all on function public.touch_license_state(text, text) from public, anon;
grant execute on function public.touch_license_state(text, text) to authenticated;
