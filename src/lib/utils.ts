import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { currencySymbol } from '@/lib/constants/currencies'

/** رمز العملة الافتراضية — يُستعمل حين لا تُمرَّر عملة المكتب. */
const DEFAULT_SYMBOL = currencySymbol(null)

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** تنسيق مبلغ مالي بالعملة المضبوطة في الإعدادات. */
export function formatMoney(amount: number | string | null | undefined, symbol = DEFAULT_SYMBOL) {
  const n = typeof amount === 'string' ? Number(amount) : (amount ?? 0)
  if (!Number.isFinite(n)) return `0.00 ${symbol}`
  return `${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${symbol}`
}

/** تنسيق تاريخ ميلادي بالعربية: 13 سبتمبر 2026 */
export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    numberingSystem: 'latn',
  }).format(d)
}

/** تاريخ قصير: 2026-09-13 */
export function formatDateShort(value: string | Date | null | undefined) {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  return d.toISOString().slice(0, 10)
}

/** وقت: 09:30 ص */
export function formatTime(value: string | null | undefined) {
  if (!value) return '—'
  const [h, m] = value.split(':').map(Number)
  if (Number.isNaN(h)) return '—'
  const period = h < 12 ? 'ص' : 'م'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${String(hour12).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')} ${period}`
}

/** تاريخ ووقت معًا. */
export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    numberingSystem: 'latn',
  }).format(d)
}

/** «منذ 3 أيام» */
export function timeAgo(value: string | Date | null | undefined) {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)
  const rtf = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' })

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000], ['month', 2592000], ['day', 86400],
    ['hour', 3600], ['minute', 60],
  ]
  for (const [unit, secs] of units) {
    const value = Math.floor(seconds / secs)
    if (value >= 1) return rtf.format(-value, unit)
  }
  return 'الآن'
}

/** عدد الأيام المتبقية حتى تاريخ معيّن (سالب = متأخر). */
export function daysUntil(value: string | Date | null | undefined): number | null {
  if (!value) return null
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(d)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

/** حجم ملف بصيغة مقروءة. */
export function formatFileSize(bytes: number | null | undefined) {
  if (!bytes) return '—'
  const units = ['بايت', 'ك.ب', 'م.ب', 'ج.ب']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

/** الأحرف الأولى للاسم — للصور الرمزية. */
export function initials(name: string | null | undefined) {
  if (!name) return '؟'
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('')
}
