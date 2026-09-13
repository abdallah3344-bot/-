/** أدوات قراءة وسائط الرابط بأمان في صفحات القوائم. */

export const DEFAULT_PAGE_SIZE = 20

export type SearchParams = Record<string, string | string[] | undefined>

export function readParam(params: SearchParams, key: string): string | undefined {
  const value = params[key]
  if (Array.isArray(value)) return value[0]
  return value
}

export function readPage(params: SearchParams): number {
  const raw = readParam(params, 'page')
  const n = Number(raw)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1
}

/** يحوّل رقم الصفحة إلى نطاق صفوف لـ Supabase. */
export function pageRange(page: number, pageSize = DEFAULT_PAGE_SIZE) {
  const from = (page - 1) * pageSize
  return { from, to: from + pageSize - 1 }
}

/**
 * يُهيّئ نص بحث المستخدم للاستخدام مع ilike.
 * يُهرّب المحارف الخاصة (% و _ و \) حتى لا تُفسَّر كأنماط.
 */
export function likePattern(term: string): string {
  const escaped = term.trim().replace(/[\\%_]/g, (m) => `\\${m}`)
  return `%${escaped}%`
}

/** يبني مرشّح `or` لـ Supabase عبر عدة أعمدة. */
export function orIlike(columns: string[], term: string): string {
  const pattern = likePattern(term)
  return columns.map((c) => `${c}.ilike.${pattern}`).join(',')
}
