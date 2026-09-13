import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { logAudit } from '@/lib/audit'

/** الجداول التي تُصدَّر في النسخة الاحتياطية اليدوية. */
const EXPORT_TABLES = [
  'clients', 'cases', 'opponents', 'hearings', 'tasks', 'documents',
  'powers_of_attorney', 'contracts', 'case_fees', 'fee_installments',
  'invoices', 'invoice_items', 'payments', 'expenses', 'accounts',
  'correspondence', 'case_notes', 'case_status_history',
  'case_types', 'courts', 'court_chambers', 'judges',
  'document_categories', 'expense_categories', 'settings',
] as const

/**
 * تصدير نسخة احتياطية كاملة كملف JSON.
 *
 * يجري على الخادم عمدًا: التصدير من المتصفح كان يعني خمسة وعشرين طلبًا
 * متتاليًا عبر الشبكة، وأي انقطاع في أحدها يُفسد النسخة ويُبطئها.
 * هنا طلب واحد من المتصفح، والاستعلامات تجري قرب قاعدة البيانات.
 *
 * الاستعلامات تمرّ بعميل المستخدم، فسياسات RLS تُصفّي ما لا يملك
 * صلاحية قراءته — التصدير لا يتجاوز الصلاحيات.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'انتهت الجلسة.' }, { status: 401 })
  }

  if (!user.permissions.can('settings', 'view')) {
    return NextResponse.json(
      { error: 'ليس لديك صلاحية تصدير نسخة احتياطية.' },
      { status: 403 },
    )
  }

  const supabase = await createClient()
  const tables: Record<string, unknown[]> = {}
  const skipped: string[] = []
  let totalRows = 0

  for (const table of EXPORT_TABLES) {
    const { data, error } = await supabase.from(table).select('*').limit(50000)
    if (error) {
      skipped.push(table)
      continue
    }
    tables[table] = data ?? []
    totalRows += data?.length ?? 0
  }

  await logAudit({
    action: 'backup',
    entity: 'settings',
    summary: `تصدير نسخة احتياطية (${totalRows} سجلًا من ${Object.keys(tables).length} جدولًا)`,
  })

  const payload = {
    system: 'نظام إدارة مكتب المحاماة',
    exported_at: new Date().toISOString(),
    exported_by: user.fullName,
    total_rows: totalRows,
    skipped_tables: skipped,
    tables,
  }

  const filename = `law-office-backup-${new Date().toISOString().slice(0, 10)}.json`

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
