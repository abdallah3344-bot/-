import { todayISO } from '@/lib/utils'
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

  // Supabase يعيد 1000 صف كحدّ أقصى في الطلب الواحد مهما كان limit —
  // فالجدول الأكبر من ذلك كان يُصدَّر ناقصًا بصمت. نقرأ على دفعات.
  const PAGE = 1000
  for (const table of EXPORT_TABLES) {
    const rows: unknown[] = []
    let error: string | null = null
    for (let from = 0; ; from += PAGE) {
      // ترتيب ثابت (بالمعرّف) حتى لا تتكرر الصفوف أو تسقط بين الدفعات
      const res = await supabase.from(table).select('*').order('id').range(from, from + PAGE - 1)
      if (res.error) { error = res.error.message; break }
      rows.push(...(res.data ?? []))
      if ((res.data?.length ?? 0) < PAGE) break
    }
    if (error && rows.length === 0) {
      skipped.push(table)
      continue
    }
    if (error) skipped.push(`${table} (ناقص)`)
    tables[table] = rows
    totalRows += rows.length
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

  const filename = `law-office-backup-${todayISO()}.json`

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
