import 'server-only'

import { createClient } from '@/lib/supabase/server'
import {
  DEFAULT_PAGE_SIZE, pageRange, orIlike, readParam, readPage, type SearchParams,
} from '@/lib/query'

export type DocumentRow = {
  id: string
  name: string
  storage_path: string
  mime_type: string | null
  size_bytes: number | null
  doc_date: string | null
  description: string | null
  ocr_status: string
  created_at: string
  category_id: string | null
  case_id: string | null
  client_id: string | null
  document_categories: { id: string; name_ar: string } | null
  cases: { id: string; title: string; internal_no: string } | null
  clients: { id: string; name: string } | null
  uploader: { id: string; full_name: string } | null
}

const SELECT = `
  id, name, storage_path, mime_type, size_bytes, doc_date, description,
  ocr_status, created_at, category_id, case_id, client_id,
  document_categories:category_id(id, name_ar),
  cases:case_id(id, title, internal_no),
  clients:client_id(id, name),
  uploader:uploaded_by(id, full_name)
`

export async function listDocuments(params: SearchParams) {
  const supabase = await createClient()
  const page = readPage(params)
  const { from, to } = pageRange(page)

  const term = readParam(params, 'q')
  const category = readParam(params, 'category')
  const caseId = readParam(params, 'case')
  const clientId = readParam(params, 'client')

  let query = supabase.from('documents').select(SELECT, { count: 'exact' }).is('deleted_at', null)

  if (term) query = query.or(orIlike(['name', 'description'], term))
  if (category) query = query.eq('category_id', category)
  if (caseId) query = query.eq('case_id', caseId)
  if (clientId) query = query.eq('client_id', clientId)

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(`تعذّر جلب المستندات: ${error.message}`)

  return {
    rows: (data ?? []) as unknown as DocumentRow[],
    total: count ?? 0,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  }
}

export async function listDocumentCategories() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('document_categories')
    .select('id, name_ar')
    .eq('is_active', true)
    .order('sort_order')

  if (error) throw new Error(`تعذّر جلب التصنيفات: ${error.message}`)
  return data ?? []
}
