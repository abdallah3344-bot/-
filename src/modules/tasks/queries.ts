import 'server-only'

import { createClient } from '@/lib/supabase/server'
import {
  DEFAULT_PAGE_SIZE, pageRange, orIlike, readParam, readPage, type SearchParams,
} from '@/lib/query'

export type TaskRow = {
  id: string
  title: string
  description: string | null
  due_date: string | null
  priority: string
  status: string
  notes: string | null
  case_id: string | null
  client_id: string | null
  assignee_id: string | null
  cases: { id: string; title: string; internal_no: string } | null
  clients: { id: string; name: string } | null
  assignee: { id: string; full_name: string } | null
}

const SELECT = `
  id, title, description, due_date, priority, status, notes,
  case_id, client_id, assignee_id,
  cases:case_id(id, title, internal_no),
  clients:client_id(id, name),
  assignee:assignee_id(id, full_name)
`

export async function listTasks(params: SearchParams) {
  const supabase = await createClient()

  // تعليم المهام المتأخرة قبل القراءة، حتى تعكس القائمة الواقع دائمًا
  await supabase.rpc('mark_overdue_tasks')

  const page = readPage(params)
  const { from, to } = pageRange(page)

  const term = readParam(params, 'q')
  const status = readParam(params, 'status')
  const priority = readParam(params, 'priority')
  const assignee = readParam(params, 'assignee')
  const caseId = readParam(params, 'case')

  let query = supabase.from('tasks').select(SELECT, { count: 'exact' }).is('deleted_at', null)

  if (term) query = query.or(orIlike(['title', 'description'], term))
  if (status === 'open') query = query.in('status', ['new', 'in_progress', 'late'])
  else if (status) query = query.eq('status', status)
  if (priority) query = query.eq('priority', priority)
  if (assignee) query = query.eq('assignee_id', assignee)
  if (caseId) query = query.eq('case_id', caseId)

  const { data, count, error } = await query
    .order('due_date', { ascending: true, nullsFirst: false })
    .range(from, to)

  if (error) throw new Error(`تعذّر جلب المهام: ${error.message}`)

  return {
    rows: (data ?? []) as unknown as TaskRow[],
    total: count ?? 0,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  }
}

export async function getTaskCounts() {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  const base = () =>
    supabase.from('tasks').select('id', { count: 'exact', head: true }).is('deleted_at', null)

  const [open, late, done] = await Promise.all([
    base().in('status', ['new', 'in_progress']),
    base().lt('due_date', today).not('status', 'in', '("completed","cancelled")'),
    base().eq('status', 'completed'),
  ])

  return { open: open.count ?? 0, late: late.count ?? 0, done: done.count ?? 0 }
}
