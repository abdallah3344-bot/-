import { Badge } from '@/components/ui/badge'
import { daysUntil, formatDate } from '@/lib/utils'

/**
 * يعرض تاريخ الانتهاء مع تحذير مبكّر.
 * اللون وحده لا يكفي، فالنص يذكر المدة صراحةً.
 */
export function ExpiryBadge({
  date, warnDays = 30,
}: {
  date: string | null
  warnDays?: number
}) {
  if (!date) return <span className="text-sm text-muted-foreground">بلا تاريخ انتهاء</span>

  const days = daysUntil(date)
  if (days === null) return <span className="text-sm text-muted-foreground">—</span>

  if (days < 0) {
    return (
      <span className="block">
        <span className="block text-sm tabular">{formatDate(date)}</span>
        <Badge variant="danger" className="mt-0.5">منتهٍ منذ {Math.abs(days)} يوم</Badge>
      </span>
    )
  }

  if (days <= warnDays) {
    return (
      <span className="block">
        <span className="block text-sm tabular">{formatDate(date)}</span>
        <Badge variant="warning" className="mt-0.5">
          {days === 0 ? 'ينتهي اليوم' : `ينتهي بعد ${days} يوم`}
        </Badge>
      </span>
    )
  }

  return <span className="block text-sm tabular">{formatDate(date)}</span>
}
