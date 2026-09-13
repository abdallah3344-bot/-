import 'server-only'

import { createClient } from '@/lib/supabase/server'
import {
  DEFAULT_PAGE_SIZE, pageRange, orIlike, readParam, readPage, type SearchParams,
} from '@/lib/query'

export type CorrespondenceRow = {
  id: string
  reference_no: string
  direction: string
  party_type: string
  party_name: string
  subject: string
  body: string | null
  corr_date: string
  status: string
  client_id: string | null
  case_id: string | null
  owner_id: string | null
  document_id: string | null
  clients: { id: string; name: string } | null
  cases: { id: string; title: string } | null
  owner: { id: string; full_name: string } | null
}

export async function listCorrespondence(params: SearchParams) {
  const supabase = await createClient()
  const page = readPage(params)
  const { from, to } = pageRange(page)

  const term = readParam(params, 'q')
  const direction = readParam(params, 'direction')
  const partyType = readParam(params, 'party')
  const status = readParam(params, 'status')

  let query = supabase
    .from('correspondence')
    .select(`
      id, reference_no, direction, party_type, party_name, subject, body,
      corr_date, status, client_id, case_id, owner_id, document_id,
      clients:client_id(id, name),
      cases:case_id(id, title),
      owner:owner_id(id, full_name)
    `, { count: 'exact' })
    .is('deleted_at', null)

  if (term) query = query.or(orIlike(['subject', 'party_name', 'reference_no'], term))
  if (direction) query = query.eq('direction', direction)
  if (partyType) query = query.eq('party_type', partyType)
  if (status) query = query.eq('status', status)

  const { data, count, error } = await query
    .order('corr_date', { ascending: false })
    .range(from, to)

  if (error) throw new Error(`تعذّر جلب المراسلات: ${error.message}`)

  return {
    rows: (data ?? []) as unknown as CorrespondenceRow[],
    total: count ?? 0,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  }
}

export async function getCorrespondenceCounts() {
  const supabase = await createClient()
  const base = () =>
    supabase.from('correspondence').select('id', { count: 'exact', head: true })
      .is('deleted_at', null)

  const [outgoing, incoming, open] = await Promise.all([
    base().eq('direction', 'outgoing'),
    base().eq('direction', 'incoming'),
    base().neq('status', 'closed'),
  ])

  return {
    outgoing: outgoing.count ?? 0,
    incoming: incoming.count ?? 0,
    open: open.count ?? 0,
  }
}
