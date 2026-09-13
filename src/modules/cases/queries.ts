import 'server-only'

import { createClient } from '@/lib/supabase/server'
import {
  DEFAULT_PAGE_SIZE, pageRange, orIlike, readParam, readPage, type SearchParams,
} from '@/lib/query'

export type CaseRow = {
  id: string
  internal_no: string
  court_case_no: string | null
  title: string
  client_id: string
  status: string
  priority: string
  registered_at: string | null
  first_hearing_at: string | null
  claim_amount: string | number | null
  clients: { id: string; name: string; client_no: string } | null
  case_types: { id: string; name_ar: string; color: string } | null
  courts: { id: string; name_ar: string } | null
  responsible: { id: string; full_name: string } | null
}

const LIST_SELECT = `
  id, internal_no, court_case_no, title, client_id, status, priority,
  registered_at, first_hearing_at, claim_amount,
  clients:client_id(id, name, client_no),
  case_types:case_type_id(id, name_ar, color),
  courts:court_id(id, name_ar),
  responsible:responsible_lawyer_id(id, full_name)
`

export async function listCases(params: SearchParams, options?: { archived?: boolean }) {
  const supabase = await createClient()
  const page = readPage(params)
  const { from, to } = pageRange(page)

  const term = readParam(params, 'q')
  const status = readParam(params, 'status')
  const type = readParam(params, 'type')
  const court = readParam(params, 'court')
  const lawyer = readParam(params, 'lawyer')
  const priority = readParam(params, 'priority')
  const clientId = readParam(params, 'client')

  let query = supabase
    .from('cases')
    .select(LIST_SELECT, { count: 'exact' })
    .is('deleted_at', null)

  // الأرشيف والقائمة النشطة يتقاسمان نفس الاستعلام بمرشّح معاكس
  if (options?.archived) query = query.in('status', ['closed', 'archived'])
  else if (status === 'open') query = query.not('status', 'in', '("closed","archived")')
  else if (status) query = query.eq('status', status)
  else query = query.not('status', 'in', '("archived")')

  if (term) query = query.or(orIlike(['title', 'internal_no', 'court_case_no'], term))
  if (type) query = query.eq('case_type_id', type)
  if (court) query = query.eq('court_id', court)
  if (priority) query = query.eq('priority', priority)
  if (clientId) query = query.eq('client_id', clientId)
  if (lawyer) query = query.or(`responsible_lawyer_id.eq.${lawyer},assistant_lawyer_id.eq.${lawyer}`)

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(`تعذّر جلب القضايا: ${error.message}`)

  return {
    rows: (data ?? []) as unknown as CaseRow[],
    total: count ?? 0,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  }
}

export async function getCase(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cases')
    .select(`
      id, internal_no, court_case_no, title, client_id, status, priority,
      registered_at, first_hearing_at, claim_amount, governorate, litigation_degree,
      description, notes, closed_at, close_reason, archived_at, created_at,
      responsible_lawyer_id, assistant_lawyer_id, case_type_id, court_id, chamber_id, judge_id,
      clients:client_id(id, name, client_no, phone),
      case_types:case_type_id(id, name_ar, color),
      courts:court_id(id, name_ar, governorate),
      court_chambers:chamber_id(id, name_ar),
      judges:judge_id(id, full_name),
      responsible:responsible_lawyer_id(id, full_name),
      assistant:assistant_lawyer_id(id, full_name)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw new Error(`تعذّر جلب القضية: ${error.message}`)
  return data as Record<string, unknown> | null
}

export async function listOpponents(caseId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('opponents')
    .select('id, name, national_id, phone, address, lawyer_name, lawyer_phone, notes')
    .eq('case_id', caseId)
    .order('created_at')

  if (error) throw new Error(`تعذّر جلب الخصوم: ${error.message}`)
  return data ?? []
}

/** المراجع اللازمة لنماذج القضايا. */
export async function getCaseFormOptions() {
  const supabase = await createClient()

  const [clients, caseTypes, courts, chambers, judges, lawyers] = await Promise.all([
    supabase.from('clients').select('id, name, client_no')
      .is('deleted_at', null).eq('status', 'active').order('name').limit(1000),
    supabase.from('case_types').select('id, name_ar').eq('is_active', true).order('sort_order'),
    supabase.from('courts').select('id, name_ar, governorate').eq('is_active', true).order('name_ar'),
    supabase.from('court_chambers').select('id, name_ar, court_id').eq('is_active', true).order('name_ar'),
    supabase.from('judges').select('id, full_name, court_id').eq('is_active', true).order('full_name'),
    supabase.from('profiles').select('id, full_name, roles!inner(code)')
      .eq('is_active', true).is('deleted_at', null)
      .in('roles.code', ['lawyer', 'office_manager', 'super_admin'])
      .order('full_name'),
  ])

  return {
    clients: clients.data ?? [],
    caseTypes: caseTypes.data ?? [],
    courts: courts.data ?? [],
    chambers: (chambers.data ?? []) as { id: string; name_ar: string; court_id: string }[],
    judges: (judges.data ?? []) as { id: string; full_name: string; court_id: string | null }[],
    lawyers: (lawyers.data ?? []) as unknown as { id: string; full_name: string }[],
  }
}

/** أرقام تبويبات مساحة عمل القضية. */
export async function getCaseCounts(caseId: string) {
  const supabase = await createClient()
  const [hearings, documents, tasks, opponents, invoices, expenses] = await Promise.all([
    supabase.from('hearings').select('id', { count: 'exact', head: true })
      .eq('case_id', caseId).is('deleted_at', null),
    supabase.from('documents').select('id', { count: 'exact', head: true })
      .eq('case_id', caseId).is('deleted_at', null),
    supabase.from('tasks').select('id', { count: 'exact', head: true })
      .eq('case_id', caseId).is('deleted_at', null),
    supabase.from('opponents').select('id', { count: 'exact', head: true }).eq('case_id', caseId),
    supabase.from('invoices').select('id', { count: 'exact', head: true })
      .eq('case_id', caseId).is('deleted_at', null),
    supabase.from('expenses').select('id', { count: 'exact', head: true })
      .eq('case_id', caseId).is('deleted_at', null),
  ])

  return {
    hearings: hearings.count ?? 0,
    documents: documents.count ?? 0,
    tasks: tasks.count ?? 0,
    opponents: opponents.count ?? 0,
    invoices: invoices.count ?? 0,
    expenses: expenses.count ?? 0,
  }
}
