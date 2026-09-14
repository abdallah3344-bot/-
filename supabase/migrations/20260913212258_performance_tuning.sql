-- ============================================================
-- ضبط الأداء بناءً على نتائج فاحص Supabase
-- ============================================================

-- ------------------------------------------------------------
-- 1) منع إعادة تقييم auth.uid() لكل صف
--    لفّها في (select ...) يجعل PostgreSQL يُقيّمها مرة واحدة
--    لكل استعلام بدل مرة لكل صف — فرق كبير مع نمو البيانات.
-- ------------------------------------------------------------

-- profiles: دمج سياستَي القراءة في واحدة (تعدد السياسات المتساهلة
-- يعني تنفيذ كلٍّ منها على كل صف)
drop policy if exists profiles_select_self   on public.profiles;
drop policy if exists profiles_select_others on public.profiles;

create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (deleted_at is null
        and (public.has_perm('staff','view') or public.has_perm('users','view')))
  );

-- دمج سياستَي التعديل كذلك
drop policy if exists profiles_update_self  on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.has_perm('users','update'))
  with check (
    public.has_perm('users','update')
    or (
      -- المستخدم يعدّل بياناته الشخصية دون المساس بدوره أو تفعيله أو اسمه
      id = (select auth.uid())
      and role_id   = (select p2.role_id   from public.profiles p2 where p2.id = (select auth.uid()))
      and is_active = (select p2.is_active from public.profiles p2 where p2.id = (select auth.uid()))
      and username  = (select p2.username  from public.profiles p2 where p2.id = (select auth.uid()))
    )
  );

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete to authenticated
  using (public.has_perm('users','delete') and id <> (select auth.uid()));

-- user_permissions
drop policy if exists user_permissions_select on public.user_permissions;
create policy user_permissions_select on public.user_permissions
  for select to authenticated
  using (user_id = (select auth.uid()) or public.has_perm('users','view'));

-- cases
drop policy if exists cases_select on public.cases;
create policy cases_select on public.cases
  for select to authenticated
  using (
    deleted_at is null
    and public.has_perm('cases','view')
    and (
      not public.is_lawyer_scoped()
      or responsible_lawyer_id = (select auth.uid())
      or assistant_lawyer_id   = (select auth.uid())
    )
  );

drop policy if exists cases_update on public.cases;
create policy cases_update on public.cases
  for update to authenticated
  using (
    public.has_perm('cases','update')
    and (
      not public.is_lawyer_scoped()
      or responsible_lawyer_id = (select auth.uid())
      or assistant_lawyer_id   = (select auth.uid())
    )
  )
  with check (public.has_perm('cases','update'));

-- notifications
drop policy if exists notifications_select on public.notifications;
drop policy if exists notifications_update on public.notifications;
drop policy if exists notifications_delete on public.notifications;
drop policy if exists notifications_insert on public.notifications;

create policy notifications_select on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_insert on public.notifications
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy notifications_delete on public.notifications
  for delete to authenticated using (user_id = (select auth.uid()));

-- notification_settings
drop policy if exists notification_settings_select on public.notification_settings;
drop policy if exists notification_settings_update on public.notification_settings;
drop policy if exists notification_settings_insert on public.notification_settings;

create policy notification_settings_select on public.notification_settings
  for select to authenticated using (user_id = (select auth.uid()));
create policy notification_settings_insert on public.notification_settings
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy notification_settings_update on public.notification_settings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- fee_installments: فصل سياسة الكتابة عن القراءة بدل FOR ALL
-- الذي كان يُضيف سياسة قراءة ثانية متساهلة
drop policy if exists fee_installments_write on public.fee_installments;

create policy fee_installments_insert on public.fee_installments
  for insert to authenticated with check (public.has_perm('fees','update'));
create policy fee_installments_update on public.fee_installments
  for update to authenticated
  using (public.has_perm('fees','update'))
  with check (public.has_perm('fees','update'));
create policy fee_installments_delete on public.fee_installments
  for delete to authenticated using (public.has_perm('fees','update'));

-- ------------------------------------------------------------
-- 2) فهارس المفاتيح الأجنبية التي تُستخدم فعليًا في الربط والتصفية.
--    أعمدة التدقيق (created_by / updated_by) تُترك بلا فهارس عمدًا:
--    لا نُصفّي بها في أي استعلام، وإضافة فهرس لكل منها تُبطئ الكتابة
--    مقابل فائدة معدومة.
-- ------------------------------------------------------------
create index if not exists cases_chamber_idx          on public.cases (chamber_id);
create index if not exists cases_judge_idx            on public.cases (judge_id);
create index if not exists hearings_chamber_idx       on public.hearings (chamber_id);
create index if not exists hearings_judge_idx         on public.hearings (judge_id);
create index if not exists payments_account_idx       on public.payments (account_id);
create index if not exists payments_installment_idx   on public.payments (installment_id);
create index if not exists payments_received_by_idx   on public.payments (received_by);
create index if not exists expenses_account_idx       on public.expenses (account_id);
create index if not exists contracts_lawyer_idx       on public.contracts (lawyer_id);
create index if not exists contracts_document_idx     on public.contracts (document_id);
create index if not exists poa_lawyer_idx             on public.powers_of_attorney (lawyer_id);
create index if not exists poa_document_idx           on public.powers_of_attorney (document_id);
create index if not exists correspondence_owner_idx   on public.correspondence (owner_id);
create index if not exists correspondence_document_idx on public.correspondence (document_id);
create index if not exists documents_uploaded_by_idx  on public.documents (uploaded_by);
create index if not exists case_notes_author_idx      on public.case_notes (created_by);

-- فهرس مركّب يخدم الاستعلام الأكثر تكرارًا: جلسات نطاق زمني بحالة معيّنة
create index if not exists hearings_date_status_idx
  on public.hearings (hearing_date, status) where deleted_at is null;

-- ويخدم قائمة المهام المفتوحة المرتّبة بالاستحقاق
create index if not exists tasks_status_due_idx
  on public.tasks (status, due_date) where deleted_at is null;
;
