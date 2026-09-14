import { NextResponse, type NextRequest } from 'next/server'
import { checkPermission } from '@/lib/auth/session'
import { logAudit } from '@/lib/audit'
import { buildMizanJson } from '@/modules/templates/mizan'

/** تصدير بيانات القضية — JSON أو CSV — لإعادة إدخالها في ميزان. */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await checkPermission('cases', 'export')
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 })

  const { id } = await context.params
  const format = request.nextUrl.searchParams.get('format') === 'csv' ? 'csv' : 'json'
  const data = await buildMizanJson(id)

  await logAudit({
    action: 'export', entity: 'case', entityId: id,
    summary: `تصدير ورقة بيانات القضية (${format.toUpperCase()})`,
  })

  const stamp = new Date().toISOString().slice(0, 10)
  const filename = `case-${id.slice(0, 8)}-${stamp}.${format}`
  const disposition = `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`

  if (format === 'csv') {
    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`
    // BOM حتى يفتح Excel العربية بترميز صحيح
    const csv = '﻿' + ['الحقل,القيمة',
      ...Object.entries(data).map(([k, v]) => `${escape(k)},${escape(v)}`)].join('\r\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': disposition,
        'Cache-Control': 'no-store',
      },
    })
  }

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': disposition,
      'Cache-Control': 'no-store',
    },
  })
}
