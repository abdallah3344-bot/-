-- ============================================================
-- بيانات تجريبية للاختبار
-- تُوسَم كلها بـ is_demo حتى يمكن حذفها دفعة واحدة دون المساس
-- بأي بيانات حقيقية أدخلها المكتب.
-- ============================================================

alter table public.clients        add column if not exists is_demo boolean not null default false;
alter table public.cases          add column if not exists is_demo boolean not null default false;
alter table public.hearings       add column if not exists is_demo boolean not null default false;
alter table public.tasks          add column if not exists is_demo boolean not null default false;
alter table public.documents      add column if not exists is_demo boolean not null default false;
alter table public.invoices       add column if not exists is_demo boolean not null default false;
alter table public.payments       add column if not exists is_demo boolean not null default false;
alter table public.expenses       add column if not exists is_demo boolean not null default false;
alter table public.opponents      add column if not exists is_demo boolean not null default false;
alter table public.case_fees      add column if not exists is_demo boolean not null default false;
alter table public.correspondence add column if not exists is_demo boolean not null default false;

create index if not exists clients_demo_idx on public.clients (is_demo) where is_demo;
create index if not exists cases_demo_idx   on public.cases   (is_demo) where is_demo;

-- ------------------------------------------------------------
-- توليد البيانات التجريبية
-- ------------------------------------------------------------
create or replace function public.seed_demo_data()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _uid        uuid := auth.uid();
  _client_ids uuid[] := '{}';
  _case_ids   uuid[] := '{}';
  _client_id  uuid;
  _case_id    uuid;
  _invoice_id uuid;
  _fee_id     uuid;
  _type_id    uuid;
  _court_id   uuid;
  _cat_id     uuid;
  _exp_cat    uuid;
  _i          integer;
  _names      text[] := array[
    'شركة الأفق للتجارة', 'مؤسسة البيان للمقاولات', 'أحمد سالم الحربي',
    'شركة النخبة للاستثمار', 'فاطمة عبدالله الزهراني'
  ];
  _types      text[] := array['individual','company','institution','company','individual'];
  _titles     text[] := array[
    'مطالبة مالية ضد شركة الوفاق',
    'نزاع عقد مقاولة — مشروع الرياض',
    'دعوى عمالية — مستحقات نهاية الخدمة',
    'نزاع شراكة تجارية',
    'قضية أحوال شخصية — حضانة'
  ];
begin
  if not public.has_perm('settings','update') then
    raise exception 'يتطلب توليد البيانات التجريبية صلاحية إدارة الإعدادات'
      using errcode = '42501';
  end if;

  if exists (select 1 from public.clients where is_demo) then
    return jsonb_build_object('ok', false, 'message', 'البيانات التجريبية موجودة بالفعل.');
  end if;

  -- محكمة افتراضية إن لم توجد
  select id into _court_id from public.courts limit 1;
  if _court_id is null then
    insert into public.courts (name_ar, court_type, governorate)
    values ('المحكمة التجارية', 'تجارية', 'الرياض')
    returning id into _court_id;
  end if;

  select id into _cat_id  from public.document_categories where name_ar = 'لائحة' limit 1;
  select id into _exp_cat from public.expense_categories  where name_ar = 'رسوم محكمة' limit 1;

  -- ---------- خمسة عملاء ----------
  for _i in 1..5 loop
    insert into public.clients (
      name, client_type, national_id, phone, email, address,
      file_opened_at, responsible_lawyer_id, status, is_demo, created_by
    ) values (
      _names[_i], _types[_i],
      '10' || lpad((_i * 7919 % 100000000)::text, 8, '0'),
      '05' || lpad((_i * 1237 % 100000000)::text, 8, '0'),
      'demo' || _i || '@example.com',
      'الرياض — حي العليا',
      current_date - (_i * 30), _uid, 'active', true, _uid
    )
    returning id into _client_id;
    _client_ids := _client_ids || _client_id;
  end loop;

  -- ---------- خمس قضايا ----------
  for _i in 1..5 loop
    select id into _type_id from public.case_types
      where is_active order by sort_order offset ((_i - 1) % 14) limit 1;

    insert into public.cases (
      title, client_id, responsible_lawyer_id, case_type_id, court_id,
      court_case_no, governorate, registered_at, litigation_degree,
      claim_amount, priority, status, description, is_demo, created_by
    ) values (
      _titles[_i], _client_ids[_i], _uid, _type_id, _court_id,
      '2026/' || lpad((_i * 137)::text, 4, '0'),
      'الرياض', current_date - (_i * 21), 'first_instance',
      (_i * 45000)::numeric,
      (array['medium','high','urgent','medium','low'])[_i],
      (array['in_progress','awaiting_hearing','new','awaiting_decision','in_progress'])[_i],
      'قضية تجريبية لأغراض الاختبار والعرض.', true, _uid
    )
    returning id into _case_id;
    _case_ids := _case_ids || _case_id;

    -- خصم لكل قضية
    insert into public.opponents (case_id, name, phone, lawyer_name, is_demo)
    values (_case_id, 'الطرف المقابل ' || _i,
            '05' || lpad((_i * 4441 % 100000000)::text, 8, '0'),
            'أ. محامي الخصم ' || _i, true);

    -- جلستان: واحدة سابقة وأخرى قادمة
    insert into public.hearings (
      case_id, court_id, hearing_date, hearing_time, room,
      assigned_lawyer_id, hearing_type, status, result, is_demo, created_by
    ) values (
      _case_id, _court_id, current_date - (_i * 7), '10:00', 'A-' || _i,
      _uid, 'session', 'held', 'حضر الطرفان وطُلب أجل لتقديم المذكرات.', true, _uid
    );

    insert into public.hearings (
      case_id, court_id, hearing_date, hearing_time, room,
      assigned_lawyer_id, hearing_type, required_action, status, is_demo, created_by
    ) values (
      _case_id, _court_id, current_date + _i, '11:30', 'A-' || _i,
      _uid, 'pleading', 'تقديم المذكرة الجوابية والمستندات المؤيدة.',
      'scheduled', true, _uid
    );

    -- مهمة
    insert into public.tasks (
      title, case_id, client_id, assignee_id, due_date,
      priority, status, is_demo, created_by
    ) values (
      'إعداد مذكرة جوابية — ' || _titles[_i],
      _case_id, _client_ids[_i], _uid, current_date + (_i - 2),
      'high', case when _i <= 2 then 'in_progress' else 'new' end, true, _uid
    );

    -- أتعاب مع أقساط
    insert into public.case_fees (
      case_id, total_amount, advance_amount, installments_count,
      installment_amount, is_demo, created_by
    ) values (
      _case_id, (_i * 20000)::numeric, (_i * 5000)::numeric, 3,
      round(((_i * 20000 - _i * 5000) / 3.0)::numeric, 2), true, _uid
    )
    returning id into _fee_id;

    insert into public.fee_installments (case_fee_id, seq, amount, due_date, status)
    select _fee_id, s,
           round(((_i * 20000 - _i * 5000) / 3.0)::numeric, 2),
           current_date + (s * 30), 'pending'
    from generate_series(1, 3) s;

    -- مصروف
    insert into public.expenses (
      case_id, client_id, category_id, amount, spent_at,
      description, is_billable, is_demo, created_by
    ) values (
      _case_id, _client_ids[_i], _exp_cat, (_i * 500)::numeric,
      current_date - (_i * 10), 'رسوم رفع الدعوى', true, true, _uid
    );

    -- فاتورة ببند واحد
    insert into public.invoices (
      client_id, case_id, issue_date, due_date, tax_rate,
      status, is_demo, created_by
    ) values (
      _client_ids[_i], _case_id, current_date - (_i * 14),
      current_date + (30 - _i * 5), 0,
      'issued', true, _uid
    )
    returning id into _invoice_id;

    insert into public.invoice_items (invoice_id, description, quantity, unit_price, line_total)
    values (_invoice_id, 'أتعاب محاماة — ' || _titles[_i], 1,
            (_i * 8000)::numeric, (_i * 8000)::numeric);

    -- دفعة جزئية على أول ثلاث فواتير
    if _i <= 3 then
      insert into public.payments (
        client_id, case_id, invoice_id, amount, method, paid_at,
        received_by, is_demo, created_by
      ) values (
        _client_ids[_i], _case_id, _invoice_id, (_i * 3000)::numeric,
        'bank_transfer', current_date - (_i * 5), _uid, true, _uid
      );
    end if;

    -- مراسلة
    insert into public.correspondence (
      direction, party_type, party_name, subject, corr_date,
      client_id, case_id, owner_id, status, is_demo, created_by
    ) values (
      case when _i % 2 = 0 then 'incoming' else 'outgoing' end,
      'court', 'المحكمة التجارية — الدائرة ' || _i,
      'بخصوص القضية ' || _titles[_i], current_date - (_i * 3),
      _client_ids[_i], _case_id, _uid, 'open', true, _uid
    );
  end loop;

  return jsonb_build_object(
    'ok', true,
    'clients', 5, 'cases', 5, 'hearings', 10, 'tasks', 5,
    'invoices', 5, 'payments', 3, 'expenses', 5, 'correspondence', 5
  );
end;
$$;

-- ------------------------------------------------------------
-- حذف البيانات التجريبية وحدها
-- ------------------------------------------------------------
create or replace function public.clear_demo_data()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare _removed integer := 0; _n integer;
begin
  if not public.has_perm('settings','update') then
    raise exception 'يتطلب حذف البيانات التجريبية صلاحية إدارة الإعدادات'
      using errcode = '42501';
  end if;

  delete from public.payments       where is_demo; get diagnostics _n = row_count; _removed := _removed + _n;
  delete from public.invoices       where is_demo; get diagnostics _n = row_count; _removed := _removed + _n;
  delete from public.expenses       where is_demo; get diagnostics _n = row_count; _removed := _removed + _n;
  delete from public.case_fees      where is_demo; get diagnostics _n = row_count; _removed := _removed + _n;
  delete from public.correspondence where is_demo; get diagnostics _n = row_count; _removed := _removed + _n;
  delete from public.documents      where is_demo; get diagnostics _n = row_count; _removed := _removed + _n;
  delete from public.tasks          where is_demo; get diagnostics _n = row_count; _removed := _removed + _n;
  delete from public.hearings       where is_demo; get diagnostics _n = row_count; _removed := _removed + _n;
  delete from public.opponents      where is_demo; get diagnostics _n = row_count; _removed := _removed + _n;
  delete from public.cases          where is_demo; get diagnostics _n = row_count; _removed := _removed + _n;
  delete from public.clients        where is_demo; get diagnostics _n = row_count; _removed := _removed + _n;

  return jsonb_build_object('ok', true, 'removed', _removed);
end;
$$;

grant execute on function public.seed_demo_data()  to authenticated;
grant execute on function public.clear_demo_data() to authenticated;
revoke execute on function public.seed_demo_data()  from anon, public;
revoke execute on function public.clear_demo_data() from anon, public;
;
