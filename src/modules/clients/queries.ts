import 'server-only'

import { createClient } from '@/lib/supabase/server'
import {
  DEFAULT_PAGE_SIZE, pageRange, orIlike, readParam, readPage, type SearchParams,
} from '@/lib/query'

export type ClientRow = {
  id: string
  client_no: string
  name: string
  client_type: string
  national_id: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  address: string | null
  occupation: string | null
  file_opened_at: string
  responsible_lawyer_id: string | null
  status: string
  notes: string | null
  created_at: string
  profiles: { id: string; full_name: string } | null
}

export async function listClients(params: SearchParams) {
  const supabase = await createClient()
  const page = readPage(params)
  const { from, to } = pageRange(page)

  const term = readParam(params, 'q')
  const type = readParam(params, 'type')
  const status = readParam(params, 'status')
  const lawyer = readParam(params, 'lawyer')

  let query = supabase
    .from('clients')
    .select(
      'id, client_no, name, client_type, national_id, phone, whatsapp, email, address, occupation, file_opened_at, responsible_lawyer_id, status, notes, created_at, profiles:responsible_lawyer_id(id, full_name)',
      { count: 'exact' },
    )
    .is('deleted_at', null)

  if (term) query = query.or(orIlike(['name', 'client_no', 'phone', 'email', 'national_id'], term))
  if (type) query = query.eq('client_type', type)
  if (status) query = query.eq('status', status)
  if (lawyer) query = query.eq('responsible_lawyer_id', lawyer)

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(`تعذّر جلب العملاء: ${error.message}`)

  return {
    rows: (data ?? []) as unknown as ClientRow[],
    total: count ?? 0,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  }
}

export async function getClient(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .select(
      'id, client_no, name, client_type, national_id, phone, whatsapp, email, address, occupation, file_opened_at, responsible_lawyer_id, status, notes, created_at, updated_at, profiles:responsible_lawyer_id(id, full_name)',
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw new Error(`تعذّر جلب العميل: ${error.message}`)
  return data as unknown as ClientRow | null
}

/** قائمة المحامين والموظفين لاختيار المسؤول. */
export async function listLawyers() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, roles!inner(code)')
    .eq('is_active', true)
    .is('deleted_at', null)
    .in('roles.code', ['lawyer', 'office_manager', 'super_admin'])
    .order('full_name')

  if (error) throw new Error(`تعذّر جلب المحامين: ${error.message}`)
  return (data ?? []) as unknown as { id: string; full_name: string }[]
}

/** ملخّص أرقام صفحة العميل. */
export async function getClientSummary(clientId: string) {
  const supabase = await createClient()

  const [cases, invoices, payments, documents] = await Promise.all([
    supabase.from('cases').select('id, status', { count: 'exact' })
      .eq('client_id', clientId).is('deleted_at', null),
    supabase.from('invoices').select('total, paid_amount')
      .eq('client_id', clientId).is('deleted_at', null).neq('status', 'cancelled'),
    supabase.from('payments').select('amount')
      .eq('client_id', clientId).is('deleted_at', null),
    supabase.from('documents').select('id', { count: 'exact', head: true })
      .eq('client_id', clientId).is('deleted_at', null),
  ])

  const caseRows = cases.data ?? []
  const invoiceRows = invoices.data ?? []
  const paymentRows = payments.data ?? []

  const billed = invoiceRows.reduce((sum, i) => sum + Number(i.total ?? 0), 0)
  const paid = paymentRows.reduce((sum, p) => sum + Number(p.amount ?? 0), 0)

  return {
    casesTotal: cases.count ?? 0,
    casesOpen: caseRows.filter((c) => !['closed', 'archived'].includes(c.status)).length,
    documentsTotal: documents.count ?? 0,
    billed,
    paid,
    outstanding: billed - paid,
  }
}
