import 'server-only'

import { createClient } from '@/lib/supabase/server'

export type TemplateRow = {
  id: string
  name: string
  description: string | null
  scope: string
  category_id: string | null
  body: string | null
  file_path: string | null
  file_name: string | null
  is_active: boolean
  sort_order: number
  updated_at: string
}

export async function listTemplates(includeHidden = false): Promise<TemplateRow[]> {
  const supabase = await createClient()
  let query = supabase
    .from('document_templates')
    .select('id, name, description, scope, category_id, body, file_path, file_name, is_active, sort_order, updated_at')
    .is('deleted_at', null)
    .order('scope')
    .order('sort_order')
    .order('name')

  if (!includeHidden) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) throw new Error(`تعذّر جلب القوالب: ${error.message}`)
  return (data ?? []) as TemplateRow[]
}

export async function getTemplate(id: string): Promise<TemplateRow | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('document_templates')
    .select('id, name, description, scope, category_id, body, file_path, file_name, is_active, sort_order, updated_at')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  return (data as TemplateRow | null) ?? null
}
