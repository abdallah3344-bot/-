import type { Metadata } from 'next'
import { requirePermission } from '@/lib/auth/session'
import { getCalendarEvents } from '@/modules/calendar/queries'
import { monthBounds, EVENT_KINDS } from '@/modules/calendar/constants'
import { PageHeader } from '@/components/shared/page-header'
import { MonthCalendar } from '@/modules/calendar/components/month-calendar'
import { PrintButton } from '@/components/shared/print-button'
import type { SearchParams } from '@/lib/query'
import { readParam } from '@/lib/query'

export const metadata: Metadata = { title: 'التقويم' }

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const user = await requirePermission('calendar', 'view')
  const params = await searchParams

  const now = new Date()
  const year = Number(readParam(params, 'y')) || now.getFullYear()
  const month = Number(readParam(params, 'm')) || now.getMonth() + 1

  const safeYear = year >= 1990 && year <= 2100 ? year : now.getFullYear()
  const safeMonth = month >= 1 && month <= 12 ? month : now.getMonth() + 1

  const { from, to } = monthBounds(safeYear, safeMonth)
  const events = await getCalendarEvents(user, from, to)

  const counts = Object.keys(EVENT_KINDS).reduce<Record<string, number>>((acc, key) => {
    acc[key] = events.filter((e) => e.kind === key).length
    return acc
  }, {})

  return (
    <>
      <PageHeader
        title="التقويم"
        description={`${events.length} حدث هذا الشهر — ${
          Object.entries(counts)
            .filter(([, n]) => n > 0)
            .map(([key, n]) => `${n} ${EVENT_KINDS[key as keyof typeof EVENT_KINDS].label}`)
            .join('، ') || 'لا أحداث'
        }`}
      >
        <PrintButton />
      </PageHeader>

      <MonthCalendar year={safeYear} month={safeMonth} events={events} />
    </>
  )
}
