-- ============================================================
-- سياسات RLS لجداول الأعمال
-- المحامي لا يرى إلا القضايا المسندة إليه وكل ما يتفرّع عنها
-- ============================================================

create or replace function public.can_access_case(_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select _case_id is null or exists (
    select 1 from public.cases c
    where c.id = _case_id
      and (
        not public.is_lawyer_scoped()
        or c.responsible_lawyer_id = auth.uid()
        or c.assistant_lawyer_id   = auth.uid()
      )
  );
$$;

create or replace function public.can_access_client(_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select _client_id is null or not public.is_lawyer_scoped() or exists (
    select 1 from public.clients cl
    where cl.id = _client_id and cl.responsible_lawyer_id = auth.uid()
  ) or exists (
    select 1 from public.cases c
    where c.client_id = _client_id
      and (c.responsible_lawyer_id = auth.uid() or c.assistant_lawyer_id = auth.uid())
  );
$$;

grant execute on function public.can_access_case(uuid)   to authenticated;
grant execute on function public.can_access_client(uuid) to authenticated;

-- ------------------------------------------------------------
-- تفعيل RLS على كل الجداول
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'case_types','courts','court_chambers','judges','document_categories','expense_categories',
    'number_sequences','clients','cases','opponents','case_notes','case_status_history',
    'hearings','tasks','appointments','documents','powers_of_attorney','contracts',
    'case_fees','fee_installments','invoices','invoice_items','accounts','payments',
    'expenses','transactions','correspondence','notifications','notification_settings'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- جداول المراجع: قراءة لكل مستخدم مسجّل، تعديل بصلاحية settings.update
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'case_types','courts','court_chambers','judges','document_categories','expense_categories'
  ] loop
    execute format($p$create policy %1$s_select on public.%1$I
      for select to authenticated using (true)$p$, t);
    execute format($p$create policy %1$s_insert on public.%1$I
      for insert to authenticated with check (public.has_perm('settings','update'))$p$, t);
    execute format($p$create policy %1$s_update on public.%1$I
      for update to authenticated
      using (public.has_perm('settings','update'))
      with check (public.has_perm('settings','update'))$p$, t);
    execute format($p$create policy %1$s_delete on public.%1$I
      for delete to authenticated using (public.has_perm('settings','update'))$p$, t);
  end loop;
end $$;

-- number_sequences: تُدار حصريًا عبر الدالة SECURITY DEFINER — لا وصول مباشر
-- (RLS مفعّل بلا أي سياسة ⇒ الرفض الكامل)

-- ------------------------------------------------------------
-- العملاء
-- ------------------------------------------------------------
create policy clients_select on public.clients
  for select to authenticated
  using (deleted_at is null and public.has_perm('clients','view') and public.can_access_client(id));

create policy clients_insert on public.clients
  for insert to authenticated with check (public.has_perm('clients','create'));

create policy clients_update on public.clients
  for update to authenticated
  using (public.has_perm('clients','update') and public.can_access_client(id))
  with check (public.has_perm('clients','update'));

create policy clients_delete on public.clients
  for delete to authenticated using (public.has_perm('clients','delete'));

-- ------------------------------------------------------------
-- القضايا
-- ------------------------------------------------------------
create policy cases_select on public.cases
  for select to authenticated
  using (
    deleted_at is null
    and public.has_perm('cases','view')
    and (
      not public.is_lawyer_scoped()
      or responsible_lawyer_id = auth.uid()
      or assistant_lawyer_id   = auth.uid()
    )
  );

create policy cases_insert on public.cases
  for insert to authenticated with check (public.has_perm('cases','create'));

create policy cases_update on public.cases
  for update to authenticated
  using (
    public.has_perm('cases','update')
    and (
      not public.is_lawyer_scoped()
      or responsible_lawyer_id = auth.uid()
      or assistant_lawyer_id   = auth.uid()
    )
  )
  with check (public.has_perm('cases','update'));

create policy cases_delete on public.cases
  for delete to authenticated using (public.has_perm('cases','delete'));

-- ------------------------------------------------------------
-- الجداول التابعة للقضية — تَرِث نطاق القضية
-- ------------------------------------------------------------
do $$
declare
  rec record;
begin
  for rec in
    select * from (values
      ('opponents','cases'), ('case_notes','cases'), ('hearings','hearings'),
      ('case_fees','fees'),  ('fee_installments_placeholder','fees')
    ) as v(tbl, module)
  loop
    continue when rec.tbl = 'fee_installments_placeholder';
    execute format($p$create policy %1$s_select on public.%1$I
      for select to authenticated
      using (public.has_perm(%2$L,'view') and public.can_access_case(case_id))$p$, rec.tbl, rec.module);
    execute format($p$create policy %1$s_insert on public.%1$I
      for insert to authenticated
      with check (public.has_perm(%2$L,'create') and public.can_access_case(case_id))$p$, rec.tbl, rec.module);
    execute format($p$create policy %1$s_update on public.%1$I
      for update to authenticated
      using (public.has_perm(%2$L,'update') and public.can_access_case(case_id))
      with check (public.has_perm(%2$L,'update'))$p$, rec.tbl, rec.module);
    execute format($p$create policy %1$s_delete on public.%1$I
      for delete to authenticated
      using (public.has_perm(%2$L,'delete') and public.can_access_case(case_id))$p$, rec.tbl, rec.module);
  end loop;
end $$;

-- تاريخ حالة القضية: قراءة فقط (يكتبه trigger)
create policy case_status_history_select on public.case_status_history
  for select to authenticated
  using (public.has_perm('cases','view') and public.can_access_case(case_id));

-- ------------------------------------------------------------
-- المهام · المستندات · المصروفات — مرتبطة بقضية أو عميل
-- ------------------------------------------------------------
do $$
declare
  rec record;
begin
  for rec in
    select * from (values
      ('tasks','tasks'), ('documents','documents'), ('expenses','expenses'),
      ('appointments','calendar'), ('correspondence','correspondence')
    ) as v(tbl, module)
  loop
    execute format($p$create policy %1$s_select on public.%1$I
      for select to authenticated
      using (deleted_at is null and public.has_perm(%2$L,'view')
             and public.can_access_case(case_id) and public.can_access_client(client_id))$p$,
      rec.tbl, rec.module);
    execute format($p$create policy %1$s_insert on public.%1$I
      for insert to authenticated
      with check (public.has_perm(%2$L,'create') and public.can_access_case(case_id))$p$,
      rec.tbl, rec.module);
    execute format($p$create policy %1$s_update on public.%1$I
      for update to authenticated
      using (public.has_perm(%2$L,'update') and public.can_access_case(case_id))
      with check (public.has_perm(%2$L,'update'))$p$, rec.tbl, rec.module);
    execute format($p$create policy %1$s_delete on public.%1$I
      for delete to authenticated
      using (public.has_perm(%2$L,'delete') and public.can_access_case(case_id))$p$,
      rec.tbl, rec.module);
  end loop;
end $$;

-- ------------------------------------------------------------
-- الوكالات · العقود · الفواتير — مرتبطة بعميل
-- ------------------------------------------------------------
do $$
declare
  rec record;
begin
  for rec in
    select * from (values
      ('powers_of_attorney','poa'), ('contracts','contracts'), ('invoices','invoices')
    ) as v(tbl, module)
  loop
    execute format($p$create policy %1$s_select on public.%1$I
      for select to authenticated
      using (deleted_at is null and public.has_perm(%2$L,'view')
             and public.can_access_client(client_id))$p$, rec.tbl, rec.module);
    execute format($p$create policy %1$s_insert on public.%1$I
      for insert to authenticated
      with check (public.has_perm(%2$L,'create'))$p$, rec.tbl, rec.module);
    execute format($p$create policy %1$s_update on public.%1$I
      for update to authenticated
      using (public.has_perm(%2$L,'update') and public.can_access_client(client_id))
      with check (public.has_perm(%2$L,'update'))$p$, rec.tbl, rec.module);
    execute format($p$create policy %1$s_delete on public.%1$I
      for delete to authenticated
      using (public.has_perm(%2$L,'delete'))$p$, rec.tbl, rec.module);
  end loop;
end $$;

-- ------------------------------------------------------------
-- أقساط الأتعاب — تَرِث من case_fees
-- ------------------------------------------------------------
create policy fee_installments_select on public.fee_installments
  for select to authenticated
  using (public.has_perm('fees','view') and exists (
    select 1 from public.case_fees cf
    where cf.id = case_fee_id and public.can_access_case(cf.case_id)
  ));

create policy fee_installments_write on public.fee_installments
  for all to authenticated
  using (public.has_perm('fees','update'))
  with check (public.has_perm('fees','update'));

-- ------------------------------------------------------------
-- بنود الفاتورة — تَرِث من الفاتورة
-- ------------------------------------------------------------
create policy invoice_items_select on public.invoice_items
  for select to authenticated
  using (public.has_perm('invoices','view') and exists (
    select 1 from public.invoices i
    where i.id = invoice_id and public.can_access_client(i.client_id)
  ));

create policy invoice_items_insert on public.invoice_items
  for insert to authenticated with check (public.has_perm('invoices','create'));

create policy invoice_items_update on public.invoice_items
  for update to authenticated
  using (public.has_perm('invoices','update'))
  with check (public.has_perm('invoices','update'));

create policy invoice_items_delete on public.invoice_items
  for delete to authenticated using (public.has_perm('invoices','update'));

-- ------------------------------------------------------------
-- المقبوضات
-- ------------------------------------------------------------
create policy payments_select on public.payments
  for select to authenticated
  using (deleted_at is null and public.has_perm('payments','view')
         and public.can_access_client(client_id));

create policy payments_insert on public.payments
  for insert to authenticated with check (public.has_perm('payments','create'));

create policy payments_update on public.payments
  for update to authenticated
  using (public.has_perm('payments','update'))
  with check (public.has_perm('payments','update'));

create policy payments_delete on public.payments
  for delete to authenticated using (public.has_perm('payments','delete'));

-- ------------------------------------------------------------
-- الحسابات والحركات المالية
-- ------------------------------------------------------------
create policy accounts_select on public.accounts
  for select to authenticated using (deleted_at is null and public.has_perm('accounts','view'));

create policy accounts_insert on public.accounts
  for insert to authenticated with check (public.has_perm('accounts','create'));

create policy accounts_update on public.accounts
  for update to authenticated
  using (public.has_perm('accounts','update'))
  with check (public.has_perm('accounts','update'));

create policy accounts_delete on public.accounts
  for delete to authenticated using (public.has_perm('accounts','delete'));

create policy transactions_select on public.transactions
  for select to authenticated using (public.has_perm('accounts','view'));

create policy transactions_insert on public.transactions
  for insert to authenticated with check (public.has_perm('accounts','create'));

-- ------------------------------------------------------------
-- التنبيهات — كل مستخدم يرى تنبيهاته فقط
-- ------------------------------------------------------------
create policy notifications_select on public.notifications
  for select to authenticated using (user_id = auth.uid());

create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notifications_delete on public.notifications
  for delete to authenticated using (user_id = auth.uid());

create policy notification_settings_select on public.notification_settings
  for select to authenticated using (user_id = auth.uid());

create policy notification_settings_update on public.notification_settings
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
;