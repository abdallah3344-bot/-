import 'server-only'

import { createClient } from '@/lib/supabase/server'
import {
  CASE_STATUS_LABELS, PRIORITY_LABELS, CLIENT_TYPE_LABELS,
  HEARING_STATUS_LABELS, INVOICE_STATUS_LABELS, PAYMENT_METHOD_LABELS, labelOf,
} from '@/lib/constants/enums'

export type ReportRow = Record<string, string | number | null>

export type ReportParams = {
  from?: string
  to?: string
  lawyer?: string
  court?: string
  caseType?: string
  status?: string
  client?: string
}

type Ref = { name_ar?: string; full_name?: string; name?: string; title?: string } | null

function refText(value: unknown, key: 'name_ar' | 'full_name' | 'name' | 'title'): string {
  const ref = value as Ref
  return (ref?.[key] as string) ?? ''
}

/**
 * ينفّذ التقرير المطلوب.
 * كل استعلام يمرّ بعميل المستخدم، فسياسات RLS تُصفّي الصفوف تلقائيًا:
 * المحامي لا يرى في تقاريره إلا قضاياه.
 */
export async function runReport(slug: string, params: ReportParams): Promise<ReportRow[]> {
  const supabase = await createClient()
  const { from, to } = params

  switch (slug) {
    // ---------------- القضايا ----------------
    case 'cases-all':
    case 'cases-open':
    case 'cases-closed': {
      let query = supabase
        .from('cases')
        .select(`
          internal_no, title, registered_at, claim_amount, status, priority,
          closed_at, close_reason,
          clients:client_id(name),
          case_types:case_type_id(name_ar),
          courts:court_id(name_ar),
          responsible:responsible_lawyer_id(full_name)
        `)
        .is('deleted_at', null)

      if (slug === 'cases-open') query = query.not('status', 'in', '("closed","archived")')
      if (slug === 'cases-closed') query = query.in('status', ['closed', 'archived'])

      if (from) query = query.gte('registered_at', from)
      if (to) query = query.lte('registered_at', to)
      if (params.lawyer) query = query.eq('responsible_lawyer_id', params.lawyer)
      if (params.court) query = query.eq('court_id', params.court)
      if (params.caseType) query = query.eq('case_type_id', params.caseType)
      if (params.status) query = query.eq('status', params.status)

      const { data, error } = await query.order('registered_at', { ascending: false }).limit(5000)
      if (error) throw new Error(`تعذّر تنفيذ التقرير: ${error.message}`)

      return (data ?? []).map((row) => ({
        internal_no: row.internal_no,
        title: row.title,
        client_name: refText(row.clients, 'name'),
        case_type: refText(row.case_types, 'name_ar'),
        court_name: refText(row.courts, 'name_ar'),
        lawyer_name: refText(row.responsible, 'full_name'),
        registered_at: row.registered_at,
        claim_amount: row.claim_amount !== null ? Number(row.claim_amount) : null,
        status_label: labelOf(CASE_STATUS_LABELS, row.status),
        priority_label: labelOf(PRIORITY_LABELS, row.priority),
        closed_at: row.closed_at,
        close_reason: row.close_reason,
      }))
    }

    case 'cases-by-lawyer': {
      const { data, error } = await supabase
        .from('cases')
        .select('status, responsible:responsible_lawyer_id(full_name)')
        .is('deleted_at', null)
        .limit(10000)
      if (error) throw new Error(`تعذّر تنفيذ التقرير: ${error.message}`)

      const grouped = new Map<string, { total: number; open: number; closed: number }>()
      for (const row of data ?? []) {
        const name = refText(row.responsible, 'full_name') || 'غير مسند'
        const entry = grouped.get(name) ?? { total: 0, open: 0, closed: 0 }
        entry.total += 1
        if (['closed', 'archived'].includes(row.status)) entry.closed += 1
        else entry.open += 1
        grouped.set(name, entry)
      }

      return [...grouped.entries()]
        .map(([lawyer_name, v]) => ({ lawyer_name, ...v }))
        .sort((a, b) => b.total - a.total)
    }

    case 'cases-by-court': {
      const { data, error } = await supabase
        .from('cases')
        .select('courts:court_id(name_ar, governorate)')
        .is('deleted_at', null)
        .limit(10000)
      if (error) throw new Error(`تعذّر تنفيذ التقرير: ${error.message}`)

      const grouped = new Map<string, { governorate: string; total: number }>()
      for (const row of data ?? []) {
        const court = row.courts as { name_ar?: string; governorate?: string } | null
        const name = court?.name_ar ?? 'غير محدّدة'
        const entry = grouped.get(name) ?? { governorate: court?.governorate ?? '', total: 0 }
        entry.total += 1
        grouped.set(name, entry)
      }

      return [...grouped.entries()]
        .map(([court_name, v]) => ({ court_name, governorate: v.governorate, total: v.total }))
        .sort((a, b) => b.total - a.total)
    }

    case 'cases-by-type': {
      const { data, error } = await supabase
        .from('cases')
        .select('status, case_types:case_type_id(name_ar)')
        .is('deleted_at', null)
        .limit(10000)
      if (error) throw new Error(`تعذّر تنفيذ التقرير: ${error.message}`)

      const grouped = new Map<string, { total: number; open: number }>()
      for (const row of data ?? []) {
        const name = refText(row.case_types, 'name_ar') || 'غير محدّد'
        const entry = grouped.get(name) ?? { total: 0, open: 0 }
        entry.total += 1
        if (!['closed', 'archived'].includes(row.status)) entry.open += 1
        grouped.set(name, entry)
      }

      return [...grouped.entries()]
        .map(([case_type, v]) => ({ case_type, ...v }))
        .sort((a, b) => b.total - a.total)
    }

    // ---------------- الجلسات ----------------
    case 'hearings-upcoming':
    case 'hearings-results': {
      let query = supabase
        .from('hearings')
        .select(`
          hearing_date, hearing_time, room, status, result, decision,
          cases:case_id(title, clients:client_id(name)),
          courts:court_id(name_ar),
          assigned:assigned_lawyer_id(full_name)
        `)
        .is('deleted_at', null)

      const today = new Date().toISOString().slice(0, 10)
      if (slug === 'hearings-upcoming') {
        query = query.gte('hearing_date', from || today).eq('status', 'scheduled')
        if (to) query = query.lte('hearing_date', to)
      } else {
        query = query.in('status', ['held', 'postponed'])
        if (from) query = query.gte('hearing_date', from)
        if (to) query = query.lte('hearing_date', to)
      }

      if (params.lawyer) query = query.eq('assigned_lawyer_id', params.lawyer)
      if (params.court) query = query.eq('court_id', params.court)

      const { data, error } = await query
        .order('hearing_date', { ascending: slug === 'hearings-upcoming' })
        .limit(5000)
      if (error) throw new Error(`تعذّر تنفيذ التقرير: ${error.message}`)

      return (data ?? []).map((row) => {
        const c = row.cases as { title?: string; clients?: { name?: string } } | null
        return {
          hearing_date: row.hearing_date,
          hearing_time: row.hearing_time ? String(row.hearing_time).slice(0, 5) : '',
          case_title: c?.title ?? '',
          client_name: c?.clients?.name ?? '',
          court_name: refText(row.courts, 'name_ar'),
          room: row.room,
          lawyer_name: refText(row.assigned, 'full_name'),
          status_label: labelOf(HEARING_STATUS_LABELS, row.status),
          result: row.result,
          decision: row.decision,
        }
      })
    }

    // ---------------- العملاء ----------------
    case 'clients-active': {
      let query = supabase
        .from('clients')
        .select('client_no, name, client_type, phone, file_opened_at, profiles:responsible_lawyer_id(full_name)')
        .is('deleted_at', null)
        .eq('status', 'active')

      if (from) query = query.gte('file_opened_at', from)
      if (to) query = query.lte('file_opened_at', to)
      if (params.lawyer) query = query.eq('responsible_lawyer_id', params.lawyer)

      const { data, error } = await query.order('name').limit(5000)
      if (error) throw new Error(`تعذّر تنفيذ التقرير: ${error.message}`)

      return (data ?? []).map((row) => ({
        client_no: row.client_no,
        name: row.name,
        client_type: labelOf(CLIENT_TYPE_LABELS, row.client_type),
        phone: row.phone,
        lawyer_name: refText(row.profiles, 'full_name'),
        file_opened_at: row.file_opened_at,
      }))
    }

    case 'clients-by-cases': {
      const [clientsRes, casesRes] = await Promise.all([
        supabase.from('clients').select('id, client_no, name').is('deleted_at', null).limit(5000),
        supabase.from('cases').select('client_id, status').is('deleted_at', null).limit(10000),
      ])
      if (clientsRes.error) throw new Error(`تعذّر تنفيذ التقرير: ${clientsRes.error.message}`)

      const counts = new Map<string, { total: number; open: number }>()
      for (const row of casesRes.data ?? []) {
        const entry = counts.get(row.client_id) ?? { total: 0, open: 0 }
        entry.total += 1
        if (!['closed', 'archived'].includes(row.status)) entry.open += 1
        counts.set(row.client_id, entry)
      }

      return (clientsRes.data ?? [])
        .map((c) => ({
          client_no: c.client_no,
          name: c.name,
          total: counts.get(c.id)?.total ?? 0,
          open: counts.get(c.id)?.open ?? 0,
        }))
        .filter((r) => r.total > 0)
        .sort((a, b) => b.total - a.total)
    }

    case 'clients-receivables': {
      const [clientsRes, invoicesRes, paymentsRes] = await Promise.all([
        supabase.from('clients').select('id, client_no, name').is('deleted_at', null).limit(5000),
        supabase.from('invoices').select('client_id, total')
          .is('deleted_at', null).not('status', 'in', '("cancelled","draft")').limit(10000),
        supabase.from('payments').select('client_id, amount').is('deleted_at', null).limit(10000),
      ])
      if (clientsRes.error) throw new Error(`تعذّر تنفيذ التقرير: ${clientsRes.error.message}`)

      const billed = new Map<string, number>()
      for (const row of invoicesRes.data ?? []) {
        billed.set(row.client_id, (billed.get(row.client_id) ?? 0) + Number(row.total ?? 0))
      }
      const paid = new Map<string, number>()
      for (const row of paymentsRes.data ?? []) {
        paid.set(row.client_id, (paid.get(row.client_id) ?? 0) + Number(row.amount ?? 0))
      }

      return (clientsRes.data ?? [])
        .map((c) => {
          const b = billed.get(c.id) ?? 0
          const p = paid.get(c.id) ?? 0
          return { client_no: c.client_no, name: c.name, billed: b, paid: p, outstanding: b - p }
        })
        .filter((r) => Math.abs(r.outstanding) > 0.009)
        .sort((a, b) => b.outstanding - a.outstanding)
    }

    // ---------------- المالية ----------------
    case 'finance-payments': {
      let query = supabase
        .from('payments')
        .select('receipt_no, paid_at, amount, method, clients:client_id(name), cases:case_id(title)')
        .is('deleted_at', null)

      if (from) query = query.gte('paid_at', from)
      if (to) query = query.lte('paid_at', to)
      if (params.client) query = query.eq('client_id', params.client)

      const { data, error } = await query.order('paid_at', { ascending: false }).limit(5000)
      if (error) throw new Error(`تعذّر تنفيذ التقرير: ${error.message}`)

      return (data ?? []).map((row) => ({
        receipt_no: row.receipt_no,
        paid_at: row.paid_at,
        client_name: refText(row.clients, 'name'),
        case_title: refText(row.cases, 'title'),
        method_label: labelOf(PAYMENT_METHOD_LABELS, row.method),
        amount: Number(row.amount ?? 0),
      }))
    }

    case 'finance-expenses': {
      let query = supabase
        .from('expenses')
        .select(`
          spent_at, amount, description,
          expense_categories:category_id(name_ar),
          cases:case_id(title), clients:client_id(name)
        `)
        .is('deleted_at', null)

      if (from) query = query.gte('spent_at', from)
      if (to) query = query.lte('spent_at', to)
      if (params.client) query = query.eq('client_id', params.client)

      const { data, error } = await query.order('spent_at', { ascending: false }).limit(5000)
      if (error) throw new Error(`تعذّر تنفيذ التقرير: ${error.message}`)

      return (data ?? []).map((row) => ({
        spent_at: row.spent_at,
        category: refText(row.expense_categories, 'name_ar'),
        description: row.description,
        case_title: refText(row.cases, 'title'),
        client_name: refText(row.clients, 'name'),
        amount: Number(row.amount ?? 0),
      }))
    }

    case 'finance-invoices':
    case 'finance-receivables': {
      let query = supabase
        .from('invoices')
        .select('invoice_no, issue_date, due_date, total, paid_amount, status, clients:client_id(name)')
        .is('deleted_at', null)

      if (slug === 'finance-receivables') {
        query = query.in('status', ['issued', 'partial', 'overdue'])
      } else {
        if (from) query = query.gte('issue_date', from)
        if (to) query = query.lte('issue_date', to)
        if (params.status) query = query.eq('status', params.status)
      }
      if (params.client) query = query.eq('client_id', params.client)

      const { data, error } = await query.order('issue_date', { ascending: false }).limit(5000)
      if (error) throw new Error(`تعذّر تنفيذ التقرير: ${error.message}`)

      return (data ?? [])
        .map((row) => ({
          invoice_no: row.invoice_no,
          issue_date: row.issue_date,
          due_date: row.due_date,
          client_name: refText(row.clients, 'name'),
          total: Number(row.total ?? 0),
          paid_amount: Number(row.paid_amount ?? 0),
          remaining: Number(row.total ?? 0) - Number(row.paid_amount ?? 0),
          status_label: labelOf(INVOICE_STATUS_LABELS, row.status),
        }))
        .filter((r) => slug !== 'finance-receivables' || r.remaining > 0.009)
    }

    case 'finance-lawyer-fees': {
      const [casesRes, feesRes, paymentsRes] = await Promise.all([
        supabase.from('cases').select('id, responsible:responsible_lawyer_id(full_name)')
          .is('deleted_at', null).limit(10000),
        supabase.from('case_fees').select('case_id, total_amount').limit(10000),
        supabase.from('payments').select('case_id, amount').is('deleted_at', null).limit(10000),
      ])
      if (casesRes.error) throw new Error(`تعذّر تنفيذ التقرير: ${casesRes.error.message}`)

      const lawyerByCase = new Map<string, string>()
      for (const row of casesRes.data ?? []) {
        lawyerByCase.set(row.id, refText(row.responsible, 'full_name') || 'غير مسند')
      }

      const grouped = new Map<string, { cases_count: number; fees_total: number; collected: number }>()
      for (const [, lawyer] of lawyerByCase) {
        if (!grouped.has(lawyer)) grouped.set(lawyer, { cases_count: 0, fees_total: 0, collected: 0 })
      }
      for (const [, lawyer] of lawyerByCase) {
        grouped.get(lawyer)!.cases_count += 1
      }
      for (const row of feesRes.data ?? []) {
        const lawyer = lawyerByCase.get(row.case_id)
        if (lawyer) grouped.get(lawyer)!.fees_total += Number(row.total_amount ?? 0)
      }
      for (const row of paymentsRes.data ?? []) {
        if (!row.case_id) continue
        const lawyer = lawyerByCase.get(row.case_id)
        if (lawyer) grouped.get(lawyer)!.collected += Number(row.amount ?? 0)
      }

      return [...grouped.entries()]
        .map(([lawyer_name, v]) => ({
          lawyer_name,
          cases_count: v.cases_count,
          fees_total: v.fees_total,
          collected: v.collected,
          outstanding: v.fees_total - v.collected,
        }))
        .sort((a, b) => b.fees_total - a.fees_total)
    }

    case 'finance-profit': {
      const [paymentsRes, expensesRes] = await Promise.all([
        supabase.from('payments').select('paid_at, amount').is('deleted_at', null)
          .gte('paid_at', from || '1900-01-01').lte('paid_at', to || '2999-12-31').limit(20000),
        supabase.from('expenses').select('spent_at, amount').is('deleted_at', null)
          .gte('spent_at', from || '1900-01-01').lte('spent_at', to || '2999-12-31').limit(20000),
      ])
      if (paymentsRes.error) throw new Error(`تعذّر تنفيذ التقرير: ${paymentsRes.error.message}`)

      const months = new Map<string, { income: number; expense: number }>()
      for (const row of paymentsRes.data ?? []) {
        const key = String(row.paid_at).slice(0, 7)
        const entry = months.get(key) ?? { income: 0, expense: 0 }
        entry.income += Number(row.amount ?? 0)
        months.set(key, entry)
      }
      for (const row of expensesRes.data ?? []) {
        const key = String(row.spent_at).slice(0, 7)
        const entry = months.get(key) ?? { income: 0, expense: 0 }
        entry.expense += Number(row.amount ?? 0)
        months.set(key, entry)
      }

      return [...months.entries()]
        .map(([month, v]) => ({
          month, income: v.income, expense: v.expense, net: v.income - v.expense,
        }))
        .sort((a, b) => a.month.localeCompare(b.month))
    }

    default:
      throw new Error(`تقرير غير معروف: ${slug}`)
  }
}

/** خيارات التصفية المتاحة للتقارير. */
export async function getReportFilterOptions() {
  const supabase = await createClient()
  const [lawyers, courts, caseTypes, clients] = await Promise.all([
    supabase.from('profiles').select('id, full_name, roles!inner(code)')
      .eq('is_active', true).is('deleted_at', null)
      .in('roles.code', ['lawyer', 'office_manager', 'super_admin']).order('full_name'),
    supabase.from('courts').select('id, name_ar').eq('is_active', true).order('name_ar'),
    supabase.from('case_types').select('id, name_ar').eq('is_active', true).order('sort_order'),
    supabase.from('clients').select('id, name').is('deleted_at', null).order('name').limit(500),
  ])

  return {
    lawyers: (lawyers.data ?? []) as unknown as { id: string; full_name: string }[],
    courts: courts.data ?? [],
    caseTypes: caseTypes.data ?? [],
    clients: clients.data ?? [],
  }
}
