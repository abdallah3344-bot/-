import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { CurrentUser } from '@/lib/auth/session'
import type { CalendarEvent } from './constants'

/** يجلب أحداث شهر كامل من كل المصادر التي يملك المستخدم صلاحية عرضها. */
export async function getCalendarEvents(
  user: CurrentUser,
  from: string,
  to: string,
): Promise<CalendarEvent[]> {
  const supabase = await createClient()
  const can = user.permissions
  const events: CalendarEvent[] = []

  const [hearings, tasks, appointments, contracts, poas] = await Promise.all([
    can.can('hearings', 'view')
      ? supabase.from('hearings')
          .select('id, hearing_date, hearing_time, room, status, cases(id, title), courts(name_ar)')
          .gte('hearing_date', from).lte('hearing_date', to).is('deleted_at', null)
      : Promise.resolve({ data: [] }),

    can.can('tasks', 'view')
      ? supabase.from('tasks')
          .select('id, title, due_date, status, cases(id, title)')
          .gte('due_date', from).lte('due_date', to).is('deleted_at', null)
      : Promise.resolve({ data: [] }),

    can.can('calendar', 'view')
      ? supabase.from('appointments')
          .select('id, title, starts_at, location, status, kind, clients(id, name)')
          .gte('starts_at', `${from}T00:00:00`).lte('starts_at', `${to}T23:59:59`)
          .is('deleted_at', null)
      : Promise.resolve({ data: [] }),

    can.can('contracts', 'view')
      ? supabase.from('contracts')
          .select('id, title, end_date, status, clients(id, name)')
          .gte('end_date', from).lte('end_date', to).is('deleted_at', null)
          .neq('status', 'terminated')
      : Promise.resolve({ data: [] }),

    can.can('poa', 'view')
      ? supabase.from('powers_of_attorney')
          .select('id, poa_no, expires_at, status, clients(id, name)')
          .gte('expires_at', from).lte('expires_at', to).is('deleted_at', null)
          .eq('status', 'active')
      : Promise.resolve({ data: [] }),
  ])

  for (const h of hearings.data ?? []) {
    const c = h.cases as unknown as { id: string; title: string } | null
    const court = h.courts as unknown as { name_ar: string } | null
    events.push({
      id: `hearing-${h.id}`,
      kind: 'hearing',
      date: h.hearing_date,
      time: h.hearing_time,
      title: c?.title ?? 'جلسة',
      subtitle: [court?.name_ar, h.room ? `قاعة ${h.room}` : null].filter(Boolean).join(' · ') || null,
      href: c ? `/cases/${c.id}` : '/hearings',
      status: h.status,
    })
  }

  for (const t of tasks.data ?? []) {
    if (!t.due_date) continue
    const c = t.cases as unknown as { id: string; title: string } | null
    events.push({
      id: `task-${t.id}`,
      kind: 'task',
      date: t.due_date,
      time: null,
      title: t.title,
      subtitle: c?.title ?? null,
      href: '/tasks',
      status: t.status,
    })
  }

  for (const a of appointments.data ?? []) {
    const client = a.clients as unknown as { id: string; name: string } | null
    events.push({
      id: `appointment-${a.id}`,
      kind: 'appointment',
      date: a.starts_at.slice(0, 10),
      time: a.starts_at.slice(11, 16),
      title: a.title,
      subtitle: [client?.name, a.location].filter(Boolean).join(' · ') || null,
      href: '/calendar',
      status: a.status,
    })
  }

  for (const c of contracts.data ?? []) {
    if (!c.end_date) continue
    const client = c.clients as unknown as { id: string; name: string } | null
    events.push({
      id: `contract-${c.id}`,
      kind: 'contract',
      date: c.end_date,
      time: null,
      title: `انتهاء عقد: ${c.title}`,
      subtitle: client?.name ?? null,
      href: `/contracts`,
      status: c.status,
    })
  }

  for (const p of poas.data ?? []) {
    if (!p.expires_at) continue
    const client = p.clients as unknown as { id: string; name: string } | null
    events.push({
      id: `poa-${p.id}`,
      kind: 'poa',
      date: p.expires_at,
      time: null,
      title: `انتهاء وكالة ${p.poa_no}`,
      subtitle: client?.name ?? null,
      href: '/powers-of-attorney',
      status: p.status,
    })
  }

  return events.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return (a.time ?? '99').localeCompare(b.time ?? '99')
  })
}

