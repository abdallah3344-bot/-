import 'server-only'

import { createClient } from '@/lib/supabase/server'
import {
  DEFAULT_PAGE_SIZE, pageRange, readParam, readPage, type SearchParams,
} from '@/lib/query'

export type HearingRow = {
  id: string
  hearing_date: string
  hearing_time: string | null
  room: string | null
  hearing_type: string
  status: string
  required_action: string | null
  result: string | null
  decision: string | null
  next_hearing_date: string | null
  cases: { id: string; title: string; internal_no: string; court_case_no: string | null } | null
  courts: { id: string; name_ar: string } | null
  assigned: { id: string; full_name: string } | null
}

const SELECT = `
  id, hearing_date, hearing_time, room, hearing_type, status,
  required_action, result, decision, next_hearing_date,
  cases:case_id(id, title, internal_no, court_case_no),
  courts:court_id(id, name_ar),
  assigned:assigned_lawyer_id(id, full_name)
`

/** يحوّل نطاقًا مسمّى إلى تاريخَي بداية ونهاية. */
export function resolveRange(range: string | undefined) {
  const today = new Date()
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const addDays = (d: Date, n: number) => {
    const copy = new Date(d)
    copy.setDate(copy.getDate() + n)
    return copy
  }

  switch (range) {
    case 'today':
      return { from: iso(today), to: iso(today), label: 'جلسات اليوم' }
    case 'tomorrow': {
      const t = addDays(today, 1)
      return { from: iso(t), to: iso(t), label: 'جلسات الغد' }
    }
    case 'week':
      return { from: iso(today), to: iso(addDays(today, 7)), label: 'جلسات هذا الأسبوع' }
    case 'month':
      return { from: iso(today), to: iso(addDays(today, 30)), label: 'جلسات هذا الشهر' }
    case 'upcoming':
      return { from: iso(addDays(today, 1)), to: null, label: 'الجلسات القادمة' }
    case 'past':
      return { from: null, to: iso(addDays(today, -1)), label: 'الجلسات السابقة' }
    default:
      return { from: null, to: null, label: 'جميع الجلسات' }
  }
}

export async function listHearings(params: SearchParams) {
  const supabase = await createClient()
  const page = readPage(params)
  const { from: rowFrom, to: rowTo } = pageRange(page)

  const range = resolveRange(readParam(params, 'range'))
  const status = readParam(params, 'status')
  const court = readParam(params, 'court')
  const lawyer = readParam(params, 'lawyer')
  const caseId = readParam(params, 'case')

  let query = supabase.from('hearings').select(SELECT, { count: 'exact' }).is('deleted_at', null)

  if (range.from) query = query.gte('hearing_date', range.from)
  if (range.to) query = query.lte('hearing_date', range.to)
  if (status) query = query.eq('status', status)
  if (court) query = query.eq('court_id', court)
  if (lawyer) query = query.eq('assigned_lawyer_id', lawyer)
  if (caseId) query = query.eq('case_id', caseId)

  // الجلسات القادمة تصاعديًا (الأقرب أولًا)، والسابقة تنازليًا
  const ascending = range.from !== null

  const { data, count, error } = await query
    .order('hearing_date', { ascending })
    .order('hearing_time', { ascending: true, nullsFirst: false })
    .range(rowFrom, rowTo)

  if (error) throw new Error(`تعذّر جلب الجلسات: ${error.message}`)

  return {
    rows: (data ?? []) as unknown as HearingRow[],
    total: count ?? 0,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    rangeLabel: range.label,
  }
}

export async function getHearing(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('hearings')
    .select(`${SELECT}, case_id, court_id, chamber_id, judge_id, assigned_lawyer_id, notes`)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw new Error(`تعذّر جلب الجلسة: ${error.message}`)
  return data as Record<string, unknown> | null
}

/** إحصاء سريع لبطاقات النطاقات. */
export async function getHearingCounts() {
  const supabase = await createClient()
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const today = new Date()
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  const week = new Date(today); week.setDate(today.getDate() + 7)
  const month = new Date(today); month.setDate(today.getDate() + 30)

  const base = () =>
    supabase.from('hearings').select('id', { count: 'exact', head: true })
      .is('deleted_at', null).eq('status', 'scheduled')

  const [todayRes, tomorrowRes, weekRes, monthRes] = await Promise.all([
    base().eq('hearing_date', iso(today)),
    base().eq('hearing_date', iso(tomorrow)),
    base().gte('hearing_date', iso(today)).lte('hearing_date', iso(week)),
    base().gte('hearing_date', iso(today)).lte('hearing_date', iso(month)),
  ])

  return {
    today: todayRes.count ?? 0,
    tomorrow: tomorrowRes.count ?? 0,
    week: weekRes.count ?? 0,
    month: monthRes.count ?? 0,
  }
}

/** القضايا المتاحة لاختيارها عند إضافة جلسة. */
export async function listOpenCases() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cases')
    .select('id, title, internal_no')
    .is('deleted_at', null)
    .not('status', 'in', '("closed","archived")')
    .order('created_at', { ascending: false })
    .limit(1000)

  if (error) throw new Error(`تعذّر جلب القضايا: ${error.message}`)
  return data ?? []
}
