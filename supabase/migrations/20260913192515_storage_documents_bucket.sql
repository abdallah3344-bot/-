-- ============================================================
-- تخزين المستندات — حاوية خاصة، لا وصول مباشر إطلاقًا
-- الوصول الوحيد عبر روابط موقّتة موقّعة (signed URLs)
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,                      -- خاصة: لا يمكن فتح الملف برابط مباشر
  52428800,                   -- 50 ميجابايت للملف الواحد
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg','image/png','image/webp'
  ]
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- شعار المكتب — حاوية عامة صغيرة
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('branding', 'branding', true, 2097152,
        array['image/jpeg','image/png','image/webp','image/svg+xml'])
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- سياسات الوصول للملفات
-- ------------------------------------------------------------
drop policy if exists documents_read   on storage.objects;
drop policy if exists documents_insert on storage.objects;
drop policy if exists documents_update on storage.objects;
drop policy if exists documents_delete on storage.objects;
drop policy if exists branding_read    on storage.objects;
drop policy if exists branding_write   on storage.objects;

create policy documents_read on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and public.has_perm('documents','view'));

create policy documents_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and public.has_perm('documents','create'));

create policy documents_update on storage.objects
  for update to authenticated
  using (bucket_id = 'documents' and public.has_perm('documents','update'))
  with check (bucket_id = 'documents' and public.has_perm('documents','update'));

create policy documents_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and public.has_perm('documents','delete'));

create policy branding_read on storage.objects
  for select using (bucket_id = 'branding');

create policy branding_write on storage.objects
  for all to authenticated
  using (bucket_id = 'branding' and public.has_perm('settings','update'))
  with check (bucket_id = 'branding' and public.has_perm('settings','update'));
;