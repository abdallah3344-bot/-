-- تفعيل الترخيص وطلب النسخة التجريبية عمليتان تستحقان التسجيل في سجل العمليات
alter table public.audit_logs drop constraint if exists audit_logs_action_valid;

alter table public.audit_logs add constraint audit_logs_action_valid check (
  action = any (array[
    'login', 'logout', 'login_failed', 'create', 'update', 'delete', 'restore',
    'upload', 'download', 'print', 'export', 'permission_change',
    'password_change', 'approve', 'close', 'reopen', 'backup', 'restore_backup',
    'license_activate', 'license_trial_request'
  ])
);
