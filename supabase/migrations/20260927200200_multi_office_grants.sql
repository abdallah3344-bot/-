-- المكاتب ومالكو المنصة: قراءة فقط للمستخدم المسجَّل (والتعديل عبر دوال المالك)
revoke all on public.offices, public.platform_admins from anon;
revoke insert, update, delete, truncate on public.offices, public.platform_admins from authenticated;
