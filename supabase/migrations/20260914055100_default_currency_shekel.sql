-- العملة الافتراضية للنظام: الشيكل، مع تقييد الرمز بالعملات المدعومة
-- في الواجهة (src/lib/constants/currencies.ts) حتى لا يصل رمز حر
-- إلى الفواتير والإيصالات.

alter table public.settings alter column currency_code   set default 'ILS';
alter table public.settings alter column currency_symbol set default '₪';

alter table public.settings drop constraint if exists settings_currency_supported;
alter table public.settings add constraint settings_currency_supported check (
  currency_code = any (array['ILS', 'JOD', 'USD', 'EUR', 'SAR', 'EGP'])
);;
