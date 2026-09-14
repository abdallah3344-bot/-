/**
 * محرّك تعبئة القوالب.
 *
 * استبدال نصّي بحت: لا تنفيذ تعابير ولا منطق داخل القالب. هذا مقصود —
 * القالب مستند قانوني يوقّعه محامٍ، فلا يصحّ أن يُنتج النظام فيه فرعًا
 * أو حسابًا لا يراه من يوقّع.
 */

/** الحقل الناقص يظهر كفراغ مُعلَّم لا كقيمة مختلقة ولا كنصّ الحقل نفسه. */
export const MISSING_MARK = '__________'

const TAG = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g

export type MergeContext = Record<string, string | null | undefined>

/** يملأ القالب النصّي من سياق مسطّح. */
export function renderTemplate(body: string, context: MergeContext): string {
  return body.replace(TAG, (_match, key: string) => {
    const value = context[key]
    return value === null || value === undefined || value === '' ? MISSING_MARK : String(value)
  })
}

/** أسماء الحقول المستعملة داخل قالب — لعرض ما ينقصه قبل التوليد. */
export function usedFields(body: string): string[] {
  return [...new Set([...body.matchAll(TAG)].map((m) => m[1]))]
}

/** الحقول المستعملة في القالب ولا قيمة لها في السياق. */
export function missingFields(body: string, context: MergeContext): string[] {
  return usedFields(body).filter((key) => {
    const value = context[key]
    return value === null || value === undefined || value === ''
  })
}
