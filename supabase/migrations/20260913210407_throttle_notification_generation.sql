-- ============================================================
-- كبح توليد التنبيهات
-- التوليد يُستدعى من التخطيط العام حتى يكون عدّاد الترويسة صحيحًا
-- من أول تحميل، لكنه لا يُنفَّذ فعليًا إلا مرة كل عشر دقائق لكل مستخدم،
-- فلا يتحوّل إلى كتابة على كل تنقّل.
-- ============================================================

alter table public.notification_settings
  add column if not exists last_generated_at timestamptz;

create or replace function public.generate_notifications(_force boolean default false)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _uid      uuid := auth.uid();
  _settings public.notification_settings%rowtype;
  _created  integer := 0;
  _n        integer;
begin
  if _uid is null then
    return 0;
  end if;

  select * into _settings from public.notification_settings where user_id = _uid;
  if not found then
    insert into public.notification_settings (user_id) values (_uid)
    returning * into _settings;
  end if;

  -- كبح: لا نُعيد الفحص إن جرى خلال العشر دقائق الماضية
  if not _force
     and _settings.last_generated_at is not null
     and _settings.last_generated_at > now() - interval '10 minutes' then
    return 0;
  end if;

  update public.notification_settings
     set last_generated_at = now()
   where user_id = _uid;

  -- ---------- الجلسات القادمة ----------
  if _settings.hearing_reminder then
    insert into public.notifications (user_id, kind, title, body, entity, entity_id, link, severity)
    select
      _uid,
      case when h.hearing_date = current_date then 'hearing_today' else 'hearing_tomorrow' end,
      case when h.hearing_date = current_date
           then 'لديك جلسة اليوم'
           else 'لديك جلسة بعد ' || (h.hearing_date - current_date) || ' يوم' end,
      c.title || coalesce(' — ' || ct.name_ar, '') || coalesce(' · قاعة ' || h.room, ''),
      'hearings', h.id, '/cases/' || c.id,
      case when h.hearing_date = current_date then 'danger' else 'warning' end
    from public.hearings h
    join public.cases c on c.id = h.case_id
    left join public.courts ct on ct.id = h.court_id
    where h.deleted_at is null
      and h.status = 'scheduled'
      and h.hearing_date between current_date and current_date + _settings.hearing_days_before
      and (h.assigned_lawyer_id = _uid
           or c.responsible_lawyer_id = _uid
           or c.assistant_lawyer_id = _uid
           or not public.is_lawyer_scoped())
    on conflict do nothing;
    get diagnostics _n = row_count; _created := _created + _n;
  end if;

  -- ---------- المهام المتأخرة ----------
  if _settings.task_reminder then
    insert into public.notifications (user_id, kind, title, body, entity, entity_id, link, severity)
    select
      _uid, 'task_overdue', 'لديك مهمة متأخرة',
      t.title || ' — تأخّرت ' || (current_date - t.due_date) || ' يوم',
      'tasks', t.id, '/tasks', 'danger'
    from public.tasks t
    where t.deleted_at is null
      and t.status not in ('completed', 'cancelled')
      and t.due_date is not null
      and t.due_date < current_date
      and (t.assignee_id = _uid or t.assignee_id is null)
    on conflict do nothing;
    get diagnostics _n = row_count; _created := _created + _n;
  end if;

  -- ---------- أقساط مستحقة ----------
  if _settings.installment_reminder and public.has_perm('fees', 'view') then
    insert into public.notifications (user_id, kind, title, body, entity, entity_id, link, severity)
    select
      _uid, 'installment_due', 'يوجد قسط مستحق',
      'قسط رقم ' || fi.seq || ' بمبلغ ' || fi.amount || ' — القضية: ' || c.title,
      'fee_installments', fi.id, '/fees', 'warning'
    from public.fee_installments fi
    join public.case_fees cf on cf.id = fi.case_fee_id
    join public.cases c on c.id = cf.case_id
    where fi.status in ('pending', 'partial', 'overdue')
      and fi.due_date <= current_date
    on conflict do nothing;
    get diagnostics _n = row_count; _created := _created + _n;
  end if;

  -- ---------- عقود توشك على الانتهاء ----------
  if _settings.contract_reminder and public.has_perm('contracts', 'view') then
    insert into public.notifications (user_id, kind, title, body, entity, entity_id, link, severity)
    select
      _uid, 'contract_expiring',
      'العقد سينتهي بعد ' || (ct.end_date - current_date) || ' يوم',
      ct.title || coalesce(' — ' || cl.name, ''),
      'contracts', ct.id, '/contracts', 'warning'
    from public.contracts ct
    left join public.clients cl on cl.id = ct.client_id
    where ct.deleted_at is null
      and ct.status = 'active'
      and ct.end_date is not null
      and ct.end_date between current_date and current_date + _settings.contract_days_before
    on conflict do nothing;
    get diagnostics _n = row_count; _created := _created + _n;
  end if;

  -- ---------- وكالات توشك على الانتهاء ----------
  if _settings.poa_reminder and public.has_perm('poa', 'view') then
    insert into public.notifications (user_id, kind, title, body, entity, entity_id, link, severity)
    select
      _uid, 'poa_expiring',
      'الوكالة ستنتهي بعد ' || (p.expires_at - current_date) || ' يوم',
      'وكالة رقم ' || p.poa_no || coalesce(' — ' || cl.name, ''),
      'powers_of_attorney', p.id, '/powers-of-attorney', 'warning'
    from public.powers_of_attorney p
    left join public.clients cl on cl.id = p.client_id
    where p.deleted_at is null
      and p.status = 'active'
      and p.expires_at is not null
      and p.expires_at between current_date and current_date + _settings.poa_days_before
    on conflict do nothing;
    get diagnostics _n = row_count; _created := _created + _n;
  end if;

  -- ---------- فواتير متأخرة ----------
  if _settings.invoice_reminder and public.has_perm('invoices', 'view') then
    insert into public.notifications (user_id, kind, title, body, entity, entity_id, link, severity)
    select
      _uid, 'invoice_overdue', 'فاتورة تجاوزت تاريخ استحقاقها',
      'الفاتورة ' || i.invoice_no || ' — المتبقي ' || (i.total - i.paid_amount)
        || coalesce(' — ' || cl.name, ''),
      'invoices', i.id, '/invoices/' || i.id, 'danger'
    from public.invoices i
    left join public.clients cl on cl.id = i.client_id
    where i.deleted_at is null
      and i.status in ('issued', 'partial', 'overdue')
      and i.due_date is not null
      and i.due_date < current_date
    on conflict do nothing;
    get diagnostics _n = row_count; _created := _created + _n;
  end if;

  return _created;
end;
$$;

grant execute on function public.generate_notifications(boolean) to authenticated;
revoke execute on function public.generate_notifications(boolean) from anon, public;

comment on function public.generate_notifications(boolean) is
  'يولّد تنبيهات المستخدم الحالي. مكبوح إلى مرة كل عشر دقائق ما لم يُمرَّر _force.';
;