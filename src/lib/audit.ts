import 'server-only'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

type AuditAction =
  | 'login' | 'logout' | 'login_failed' | 'create' | 'update' | 'delete' | 'restore'
  | 'upload' | 'download' | 'print' | 'export' | 'permission_change'
  | 'password_change' | 'approve' | 'close' | 'reopen' | 'backup' | 'restore_backup'

type AuditEntry = {
  action: AuditAction
  entity: string
  entityId?: string | null
  entityLabel?: string | null
  summary?: string | null
  changes?: Record<string, unknown> | null
}

/**
 * يكتب سطرًا في سجل العمليات.
 * لا يرمي استثناءً أبدًا: فشل التسجيل يجب ألّا يُفشل العملية الأصلية،
 * لكنه يُسجَّل في الكونسول ليظهر في مراقبة الخادم.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const supabase = await createClient()
    const h = await headers()

    await supabase.rpc('write_audit_log', {
      _action: entry.action,
      _entity: entry.entity,
      _entity_id: entry.entityId ?? undefined,
      _entity_label: entry.entityLabel ?? undefined,
      _summary: entry.summary ?? undefined,
      _changes: (entry.changes ?? undefined) as never,
      _ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined,
      _user_agent: h.get('user-agent') ?? undefined,
    })
  } catch (error) {
    console.error('[audit] تعذّر كتابة سجل العملية:', error)
  }
}

/** يحسب الحقول التي تغيّرت فعليًا — لتخزين تغييرات مختصرة بدل الصف كاملًا. */
export function diffChanges<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {}
  for (const [key, next] of Object.entries(after)) {
    const prev = before[key]
    if (next !== undefined && String(prev ?? '') !== String(next ?? '')) {
      changes[key] = { from: prev ?? null, to: next ?? null }
    }
  }
  return changes
}
