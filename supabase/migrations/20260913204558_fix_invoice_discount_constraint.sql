-- ============================================================
-- إصلاح قيد الخصم على الفواتير
--
-- المشكلة: القيد discount <= subtotal كان يُفحص لحظة إدراج رأس الفاتورة،
-- وفي تلك اللحظة تكون البنود لم تُدرج بعد فـ subtotal = 0، فيفشل أي
-- إدراج بخصم أكبر من صفر. قيود CHECK في PostgreSQL لا يمكن تأجيلها،
-- فالحل أن يتكفّل محفّز إعادة الاحتساب بضمان الثبات بعد استقرار البنود.
-- ============================================================

alter table public.invoices drop constraint if exists invoices_discount_within;

-- المحفّز يُقصّ الخصم عند المجموع الفرعي، فلا يتجاوزه أبدًا بعد استقرار البنود
create or replace function public.recalc_invoice_totals()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _invoice_id uuid := coalesce(new.invoice_id, old.invoice_id);
  _subtotal numeric(14,2);
begin
  select coalesce(sum(line_total), 0) into _subtotal
    from public.invoice_items where invoice_id = _invoice_id;

  update public.invoices i
     set subtotal   = _subtotal,
         discount   = least(i.discount, _subtotal),
         tax_amount = round((_subtotal - least(i.discount, _subtotal)) * i.tax_rate / 100, 2),
         total      = (_subtotal - least(i.discount, _subtotal))
                    + round((_subtotal - least(i.discount, _subtotal)) * i.tax_rate / 100, 2)
   where i.id = _invoice_id;

  return coalesce(new, old);
end;
$$;

revoke execute on function public.recalc_invoice_totals() from anon, authenticated, public;

comment on function public.recalc_invoice_totals() is
  'يُعيد احتساب إجماليات الفاتورة عند تغيّر بنودها، ويقصّ الخصم عند المجموع الفرعي.';
;