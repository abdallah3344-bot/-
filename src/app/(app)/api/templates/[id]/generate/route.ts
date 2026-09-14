import { NextResponse, type NextRequest } from 'next/server'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { createClient } from '@/lib/supabase/server'
import { checkPermission } from '@/lib/auth/session'
import { logAudit } from '@/lib/audit'
import { getTemplate } from '@/modules/templates/queries'
import { buildCaseContext, buildClientContext } from '@/modules/templates/context'
import { MISSING_MARK } from '@/modules/templates/render'

/**
 * يملأ قالب Word المرفوع ويُعيده ملفًا جاهزًا.
 *
 * يجري على الخادم لا في المتصفح: ملفات القوالب في حاوية خاصة،
 * ولا يصحّ أن تمرّ عبر المتصفح لمجرد تعبئتها.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await checkPermission('documents', 'create')
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: 403 })
  }

  const { id } = await context.params
  const template = await getTemplate(id)

  if (!template || !template.file_path) {
    return NextResponse.json({ error: 'القالب غير موجود أو لا يحتوي ملف Word.' }, { status: 404 })
  }

  const caseId = request.nextUrl.searchParams.get('case')
  const clientId = request.nextUrl.searchParams.get('client')

  const merge = caseId
    ? await buildCaseContext(caseId)
    : clientId
      ? await buildClientContext(clientId)
      : {}

  const supabase = await createClient()
  const { data: file, error } = await supabase.storage.from('templates').download(template.file_path)

  if (error || !file) {
    return NextResponse.json({ error: 'تعذّر قراءة ملف القالب.' }, { status: 500 })
  }

  try {
    const zip = new PizZip(await file.arrayBuffer())
    const doc = new Docxtemplater(zip, {
      // نفس صيغة الحقول في القوالب النصّية
      delimiters: { start: '{{', end: '}}' },
      paragraphLoop: true,
      linebreaks: true,
      // الحقل الناقص يظهر فراغًا معلَّمًا لا اسم الحقل
      nullGetter: () => MISSING_MARK,
    })

    doc.render(merge)

    const buffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer

    await logAudit({
      action: 'export', entity: 'document_template', entityId: template.id,
      entityLabel: template.name,
      summary: `توليد مستند من قالب: ${template.name}`,
    })

    const safeName = template.name.replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'مستند'

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition':
          `attachment; filename*=UTF-8''${encodeURIComponent(`${safeName}.docx`)}`,
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'تعذّرت تعبئة القالب. تأكد أن حقول الدمج مكتوبة بصيغة {{field}} وغير مقطّعة بتنسيق داخل Word.' },
      { status: 422 },
    )
  }
}
