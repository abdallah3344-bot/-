import 'server-only'

import { createClient } from '@/lib/supabase/server'
import {
  DEFAULT_PAGE_SIZE, pageRange, orIlike, readParam, readPage, type SearchParams,
} from '@/lib/query'

export type PoaRow = {
  id: string
  poa_no: string
  poa_type: string
  issued_at: string
  expires_at: string | null
  status: string
  notes: string | null
  client_id: string
  case_id: string | null
  lawyer_id: string | null
  document_id: string | null
  clients: { id: string; name: string } | null
  cases: { id: string; title: string } | null
  lawyer: { id: string; full_name: string } | null
}

export type ContractRow = {
  id: string
  contract_no: string
  title: string
  counterparty: string | null
  contract_type: string | null
  start_date: string | null
  end_date: string | null
  value: string | number | null
  status: string
  notes: string | null
  client_id: string
  lawyer_id: string | null
  document_id: string | null
  clients: { id: string; name: string } | null
  lawyer: { id: string; full_name: string } | null
}

export async function listPoas(params: SearchParams) {
  const supabase = await createClient()
  const page = readPage(params)
  const { from, to } = pageRange(page)

  const term = readParam(params, 'q')
  const status = readParam(params, 'status')
  const type = readParam(params, 'type')
  const clientId = readParam(params, 'client')

  let query = supabase
    .from('powers_of_attorney')
    .select(`
      id, poa_no, poa_type, issued_at, expires_at, status, notes,
      client_id, case_id, lawyer_id, document_id,
      clients:client_id(id, name),
      cases:case_id(id, title),
      lawyer:lawyer_id(id, full_name)
    `, { count: 'exact' })
    .is('deleted_at', null)

  if (term) query = query.or(orIlike(['poa_no'], term))
  if (status === 'expiring') {
    const soon = new Date()
    soon.setDate(soon.getDate() + 30)
    query = query
      .eq('status', 'active')
      .not('expires_at', 'is', null)
      .lte('expires_at', soon.toISOString().slice(0, 10))
  } else if (status) {
    query = query.eq('status', status)
  }
  if (type) query = query.eq('poa_type', type)
  if (clientId) query = query.eq('client_id', clientId)

  const { data, count, error } = await query
    .order('issued_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(`تعذّر جلب الوكالات: ${error.message}`)

  return {
    rows: (data ?? []) as unknown as PoaRow[],
    total: count ?? 0,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  }
}

export async function listContracts(params: SearchParams) {
  const supabase = await createClient()
  const page = readPage(params)
  const { from, to } = pageRange(page)

  const term = readParam(params, 'q')
  const status = readParam(params, 'status')
  const clientId = readParam(params, 'client')

  let query = supabase
    .from('contracts')
    .select(`
      id, contract_no, title, counterparty, contract_type,
      start_date, end_date, value, status, notes,
      client_id, lawyer_id, document_id,
      clients:client_id(id, name),
      lawyer:lawyer_id(id, full_name)
    `, { count: 'exact' })
    .is('deleted_at', null)

  if (term) query = query.or(orIlike(['title', 'contract_no', 'counterparty'], term))
  if (status === 'expiring') {
    const soon = new Date()
    soon.setDate(soon.getDate() + 30)
    query = query
      .eq('status', 'active')
      .not('end_date', 'is', null)
      .lte('end_date', soon.toISOString().slice(0, 10))
  } else if (status) {
    query = query.eq('status', status)
  }
  if (clientId) query = query.eq('client_id', clientId)

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(`تعذّر جلب العقود: ${error.message}`)

  return {
    rows: (data ?? []) as unknown as ContractRow[],
    total: count ?? 0,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  }
}

/** عدّ ما يوشك على الانتهاء خلال 30 يومًا — لبطاقات التنبيه. */
export async function getExpiringCounts() {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)
  const soon = new Date()
  soon.setDate(soon.getDate() + 30)
  const soonIso = soon.toISOString().slice(0, 10)

  const [poaSoon, poaExpired, contractSoon, contractExpired] = await Promise.all([
    supabase.from('powers_of_attorney').select('id', { count: 'exact', head: true })
      .is('deleted_at', null).eq('status', 'active')
      .not('expires_at', 'is', null).gte('expires_at', today).lte('expires_at', soonIso),
    supabase.from('powers_of_attorney').select('id', { count: 'exact', head: true })
      .is('deleted_at', null).eq('status', 'active')
      .not('expires_at', 'is', null).lt('expires_at', today),
    supabase.from('contracts').select('id', { count: 'exact', head: true })
      .is('deleted_at', null).eq('status', 'active')
      .not('end_date', 'is', null).gte('end_date', today).lte('end_date', soonIso),
    supabase.from('contracts').select('id', { count: 'exact', head: true })
      .is('deleted_at', null).eq('status', 'active')
      .not('end_date', 'is', null).lt('end_date', today),
  ])

  return {
    poaSoon: poaSoon.count ?? 0,
    poaExpired: poaExpired.count ?? 0,
    contractSoon: contractSoon.count ?? 0,
    contractExpired: contractExpired.count ?? 0,
  }
}

/** الخيارات المشتركة لنماذج الوكالات والعقود. */
export async function getLegalDocOptions() {
  const supabase = await createClient()
  const [clients, cases, lawyers, documents] = await Promise.all([
    supabase.from('clients').select('id, name').is('deleted_at', null).order('name').limit(1000),
    supabase.from('cases').select('id, title, internal_no').is('deleted_at', null)
      .order('created_at', { ascending: false }).limit(1000),
    supabase.from('profiles').select('id, full_name, roles!inner(code)')
      .eq('is_active', true).is('deleted_at', null)
      .in('roles.code', ['lawyer', 'office_manager', 'super_admin']).order('full_name'),
    supabase.from('documents').select('id, name').is('deleted_at', null)
      .order('created_at', { ascending: false }).limit(500),
  ])

  return {
    clients: clients.data ?? [],
    cases: cases.data ?? [],
    lawyers: (lawyers.data ?? []) as unknown as { id: string; full_name: string }[],
    documents: documents.data ?? [],
  }
}
