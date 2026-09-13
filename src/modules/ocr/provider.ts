import 'server-only'

/**
 * نقطة التوسعة لاستخراج النص من المستندات (OCR) والاستخراج الذكي.
 *
 * ملاحظة مهمة: هذه الطبقة تستخرج بيانات وصفية فقط — أسماء وتواريخ
 * وأرقام. لا تتّخذ أي قرار قانوني، ولا تُعدّل قضية أو مستندًا تلقائيًا.
 * كل ما تستخرجه يبقى في حالة «بانتظار المراجعة» حتى يعتمده مستخدم.
 */

export type ExtractedFields = {
  /** النص الكامل المستخرج من المستند */
  text?: string
  /** أسماء الأشخاص أو الجهات الواردة في المستند */
  parties?: string[]
  /** رقم القضية كما ورد في المستند */
  caseNumber?: string
  /** اسم المحكمة كما ورد */
  courtName?: string
  /** التاريخ الوارد في المستند بصيغة YYYY-MM-DD */
  documentDate?: string
  /** نوع المستند المرجَّح (لائحة، حكم، وكالة…) */
  documentType?: string
  /** ثقة المزوّد في النتيجة بين 0 و1 — تُعرض للمراجِع ولا تُستخدم للقرار */
  confidence?: number
}

export type OcrResult =
  | { ok: true; fields: ExtractedFields }
  | { ok: false; error: string }

export interface OcrProvider {
  /** اسم المزوّد كما يظهر في الواجهة وسجل العمليات */
  readonly name: string
  /** هل المزوّد مهيّأ وجاهز للاستخدام؟ */
  isConfigured(): boolean
  /** يستخرج الحقول من ملف مستند */
  extract(input: { buffer: ArrayBuffer; mimeType: string; fileName: string }): Promise<OcrResult>
}

/**
 * المزوّد الافتراضي: غير مفعّل.
 *
 * النظام جاهز بنيويًا (أعمدة التخزين، حالة المعالجة، شاشة المراجعة،
 * وربط النتيجة بالقضية بعد الاعتماد)، لكن لا يوجد مزوّد OCR مُهيّأ.
 * لتفعيل الميزة: نفّذ هذه الواجهة بمزوّد حقيقي وسجّله في getOcrProvider،
 * ولا حاجة لتغيير أي شيء آخر في النظام.
 */
class DisabledOcrProvider implements OcrProvider {
  readonly name = 'غير مفعّل'

  isConfigured() {
    return false
  }

  async extract(): Promise<OcrResult> {
    return {
      ok: false,
      error: 'لم يُهيّأ مزوّد استخراج نصوص بعد. يمكن إدخال البيانات يدويًا من شاشة المراجعة.',
    }
  }
}

let provider: OcrProvider = new DisabledOcrProvider()

/** يستبدل المزوّد — يُستدعى مرة عند الإقلاع عند تفعيل الميزة. */
export function registerOcrProvider(next: OcrProvider) {
  provider = next
}

export function getOcrProvider(): OcrProvider {
  return provider
}
