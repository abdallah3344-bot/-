-- ============================================================
-- سياسات RLS لجداول الأساس
-- المبدأ: لا شيء مسموح افتراضيًا. كل وصول يمرّ عبر has_perm().
-- ============================================================

alter table public.roles            enable row level security;
alter table public.permissions      enable row level security;
alter table public.role_permissions enable row level security;
alter table public.profiles         enable row level security;
alter table public.user_permissions enable row level security;
alter table public.settings         enable row level security;
alter table public.audit_logs       enable row level security;

-- ------------------------------------------------------------
-- roles / permissions : كل مستخدم مسجّل يقرأها (لبناء الواجهة)
--                        التعديل لمن يملك users.update فقط
-- ------------------------------------------------------------
create policy roles_select on public.roles
  for select to authenticated using (true);

create policy roles_insert on public.roles
  for insert to authenticated with check (public.has_perm('users','create'));

create policy roles_update on public.roles
  for update to authenticated
  using (public.has_perm('users','update') and not is_system)
  with check (public.has_perm('users','update') and not is_system);

create policy roles_delete on public.roles
  for delete to authenticated
  using (public.has_perm('users','delete') and not is_system);

create policy permissions_select on public.permissions
  for select to authenticated using (true);

-- ------------------------------------------------------------
-- role_permissions : القراءة للجميع، التعديل بصلاحية users.update
-- ------------------------------------------------------------
create policy role_permissions_select on public.role_permissions
  for select to authenticated using (true);

create policy role_permissions_insert on public.role_permissions
  for insert to authenticated with check (public.has_perm('users','update'));

create policy role_permissions_delete on public.role_permissions
  for delete to authenticated using (public.has_perm('users','update'));

-- ------------------------------------------------------------
-- profiles :
--   - كل مستخدم يرى ملفه دائمًا
--   - من يملك staff.view أو users.view يرى بقية الموظفين
--   - كل مستخدم يعدّل بياناته الشخصية (بدون تغيير الدور أو التفعيل)
--   - من يملك users.update يعدّل الجميع
-- ------------------------------------------------------------
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_select_others on public.profiles
  for select to authenticated
  using (
    deleted_at is null
    and (public.has_perm('staff','view') or public.has_perm('users','view'))
  );

create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (public.has_perm('users','create'));

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role_id   = (select p2.role_id   from public.profiles p2 where p2.id = auth.uid())
    and is_active = (select p2.is_active from public.profiles p2 where p2.id = auth.uid())
    and username  = (select p2.username  from public.profiles p2 where p2.id = auth.uid())
  );

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.has_perm('users','update'))
  with check (public.has_perm('users','update'));

create policy profiles_delete on public.profiles
  for delete to authenticated
  using (public.has_perm('users','delete') and id <> auth.uid());

-- ------------------------------------------------------------
-- user_permissions : يرى المستخدم صلاحياته، ويديرها صاحب users.update
-- ------------------------------------------------------------
create policy user_permissions_select on public.user_permissions
  for select to authenticated
  using (user_id = auth.uid() or public.has_perm('users','view'));

create policy user_permissions_insert on public.user_permissions
  for insert to authenticated with check (public.has_perm('users','update'));

create policy user_permissions_update on public.user_permissions
  for update to authenticated
  using (public.has_perm('users','update'))
  with check (public.has_perm('users','update'));

create policy user_permissions_delete on public.user_permissions
  for delete to authenticated using (public.has_perm('users','update'));

-- ------------------------------------------------------------
-- settings : يقرأها كل مستخدم مسجّل (اسم المكتب والشعار يظهران في كل صفحة)
--            يعدّلها صاحب settings.update فقط
-- ------------------------------------------------------------
create policy settings_select on public.settings
  for select to authenticated using (true);

create policy settings_update on public.settings
  for update to authenticated
  using (public.has_perm('settings','update'))
  with check (public.has_perm('settings','update'));

-- ------------------------------------------------------------
-- audit_logs : قراءة فقط لمن يملك audit.view — ولا تعديل ولا حذف لأحد إطلاقًا
--              (الإدراج يتم حصريًا عبر write_audit_log وهي SECURITY DEFINER)
-- ------------------------------------------------------------
create policy audit_logs_select on public.audit_logs
  for select to authenticated
  using (public.has_perm('audit','view'));
;