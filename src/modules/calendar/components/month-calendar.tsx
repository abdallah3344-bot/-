'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, CalendarDays } from 'lucide-react'
import { EVENT_KINDS, type CalendarEvent } from '../constants'
import { Button } from '@/components/ui/button'
import { cn, formatTime } from '@/lib/utils'

type Props = {
  year: number
  month: number
  events: CalendarEvent[]
}

const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

export function MonthCalendar({ year, month, events }: Props) {
  const router = useRouter()

  const firstDay = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const startWeekday = firstDay.getDay() // 0 = الأحد
  const todayIso = new Date().toISOString().slice(0, 10)
  const pad = (n: number) => String(n).padStart(2, '0')

  const byDate = new Map<string, CalendarEvent[]>()
  for (const event of events) {
    const list = byDate.get(event.date) ?? []
    list.push(event)
    byDate.set(event.date, list)
  }

  // خلايا الشبكة: فراغات قبل أول يوم ثم أيام الشهر
  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function go(delta: number) {
    const target = new Date(year, month - 1 + delta, 1)
    router.push(`/calendar?y=${target.getFullYear()}&m=${target.getMonth() + 1}`)
  }

  return (
    <div className="space-y-4">
      {/* التنقّل بين الشهور */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-1">
          {/* في RTL يشير «السابق» لليمين */}
          <Button variant="outline" size="icon" onClick={() => go(-1)} aria-label="الشهر السابق">
            <ChevronRight className="size-4" />
          </Button>
          <span className="min-w-36 text-center font-semibold tabular">
            {MONTHS[month - 1]} {year}
          </span>
          <Button variant="outline" size="icon" onClick={() => go(1)} aria-label="الشهر التالي">
            <ChevronLeft className="size-4" />
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={() => {
          const now = new Date()
          router.push(`/calendar?y=${now.getFullYear()}&m=${now.getMonth() + 1}`)
        }}>
          <CalendarDays className="size-4" />
          اليوم
        </Button>
      </div>

      {/* وسيلة الإيضاح — الألوان وحدها لا تكفي، فكل حدث يحمل نصه أيضًا */}
      <ul className="flex flex-wrap items-center gap-4">
        {Object.entries(EVENT_KINDS).map(([key, meta]) => (
          <li key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden />
            {meta.label}
          </li>
        ))}
      </ul>

      {/* الشبكة */}
      <div className="overflow-hidden rounded-[var(--radius-app)] border border-border bg-surface">
        <div className="grid grid-cols-7 border-b border-border bg-surface-muted">
          {WEEKDAYS.map((day) => (
            <div key={day} className="p-2 text-center text-xs font-semibold text-muted-foreground">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.slice(0, 3)}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="min-h-24 border-b border-s border-border bg-surface-muted/40" />
            }

            const iso = `${year}-${pad(month)}-${pad(day)}`
            const dayEvents = byDate.get(iso) ?? []
            const isToday = iso === todayIso

            return (
              <div
                key={iso}
                className={cn(
                  'min-h-24 border-b border-s border-border p-1.5',
                  isToday && 'bg-gold-50/60 dark:bg-gold-900/15',
                )}
              >
                <div className="mb-1 flex justify-end">
                  <span
                    className={cn(
                      'inline-flex size-6 items-center justify-center rounded-full text-xs tabular',
                      isToday
                        ? 'bg-gold-500 font-bold text-navy-950'
                        : 'text-muted-foreground',
                    )}
                  >
                    {day}
                  </span>
                </div>

                <ul className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <li key={event.id}>
                      <Link
                        href={event.href}
                        title={`${EVENT_KINDS[event.kind].label}: ${event.title}`}
                        className="flex items-start gap-1 rounded px-1 py-0.5 text-[11px] leading-tight hover:bg-surface-muted"
                      >
                        <span
                          className="mt-1 size-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: EVENT_KINDS[event.kind].color }}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {event.time ? (
                            <span className="tabular text-muted-foreground">
                              {formatTime(event.time)}{' '}
                            </span>
                          ) : null}
                          {event.title}
                        </span>
                      </Link>
                    </li>
                  ))}

                  {dayEvents.length > 3 ? (
                    <li className="px-1 text-[11px] text-muted-foreground">
                      +{dayEvents.length - 3} أخرى
                    </li>
                  ) : null}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
