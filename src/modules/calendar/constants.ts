/**
 * ثوابت وأنواع التقويم المشتركة بين الخادم والعميل.
 * مفصولة عن queries.ts لأن الأخير 'server-only'، واستيراده من
 * مكوّن عميل يسحب كود الخادم إلى حزمة المتصفح.
 */

export type CalendarEventKind = 'hearing' | 'task' | 'appointment' | 'contract' | 'poa'

export type CalendarEvent = {
  id: string
  kind: CalendarEventKind
  date: string
  time: string | null
  title: string
  subtitle: string | null
  href: string
  status: string | null
}

/** ألوان أنواع الأحداث — ثابتة عبر التقويم ووسيلة الإيضاح. */
export const EVENT_KINDS: Record<CalendarEventKind, { label: string; color: string }> = {
  hearing:     { label: 'جلسة',         color: '#2a78d6' },
  task:        { label: 'مهمة',         color: '#eb6834' },
  appointment: { label: 'موعد',         color: '#1baf7a' },
  contract:    { label: 'انتهاء عقد',   color: '#4a3aa7' },
  poa:         { label: 'انتهاء وكالة', color: '#e34948' },
}

/** حدود الشهر المعروض بصيغة ISO. */
export function monthBounds(year: number, month: number) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const lastDay = new Date(year, month, 0).getDate()
  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(lastDay)}`,
  }
}
