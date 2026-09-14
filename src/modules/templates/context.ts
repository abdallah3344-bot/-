import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { formatDate, formatMoney } from '@/lib/utils'
import { currencySymbol } from '@/lib/constants/currencies'
import {
  CASE_STATUS_LABELS, CLIENT_TYPE_LABELS, LITIGATION_DEGREE_LABELS, labelOf,
} from '@/lib/constants/enums'
import type { MergeContext } from './render'

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

/** التاريخ الهجري — للقوالب الشرعية التي تذكر التاريخين. */
function hijriToday(): string {
  return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
    day: 'numeric', month: 'long', year: 'numeric', numberingSystem: 'latn',
  }).format(new Date())
}

type Row = Record<string, unknown>

/** بيانات المكتب والمستخدم — مشتركة بين كل القوالب. */
async function baseContext(): Promise<MergeContext> {
  const supabase = await createClient()
  const [{ data: settings }, user] = await Promise.all([
    supabase.from('settings')
      .select('office_name, office_address, office_phone, office_email, tax_number, currency_code')
      .maybeSingle(),
    getCurrentUser(),
  ])

  return {
    'office.name':       text(settings?.office_name),
    'office.address':    text(settings?.office_address),
    'office.phone':      text(settings?.office_phone),
    'office.email':      text(settings?.office_email),
    'office.tax_number': text(settings?.tax_number),
    'today':             formatDate(new Date()),
    'today.hijri':       hijriToday(),
    'user.name':         text(user?.fullName),
  }
}

function clientContext(client: Row | null): MergeContext {
  if (!client) return {}
  return {
    'client.name':           text(client.name),
    'client.type':           labelOf(CLIENT_TYPE_LABELS, text(client.client_type), ''),
    'client.national_id':    text(client.national_id),
    'client.occupation':     text(client.occupation),
    'client.workplace':      text(client.workplace),
    'client.address':        text(client.address),
    'client.phone':          text(client.phone),
    'client.email':          text(client.email),
    'client.legal_capacity': text(client.legal_capacity),
  }
}

/** سياق قالب على مستوى الموكل. */
export async function buildClientContext(clientId: string): Promise<MergeContext> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('clients')
    .select('name, client_type, national_id, occupation, workplace, address, phone, email, legal_capacity')
    .eq('id', clientId)
    .is('deleted_at', null)
    .maybeSingle()

  return { ...(await baseContext()), ...clientContext(data as Row | null) }
}

/** سياق قالب على مستوى القضية — يشمل الموكل والخصوم. */
export async function buildCaseContext(caseId: string): Promise<MergeContext> {
  const supabase = await createClient()

  const [{ data: row }, { data: opponents }, { data: settings }] = await Promise.all([
    supabase.from('cases').select(`
      internal_no, court_case_no, title, governorate, litigation_degree, status,
      registered_at, first_hearing_at, claim_amount, description,
      claim_requests, claim_arose_at, property_description,
      clients:client_id(name, client_type, national_id, occupation, workplace, address, phone, email, legal_capacity),
      case_types:case_type_id(name_ar),
      courts:court_id(name_ar),
      responsible:responsible_lawyer_id(full_name)
    `).eq('id', caseId).is('deleted_at', null).maybeSingle(),
    supabase.from('opponents')
      .select('name, national_id, occupation, workplace, address, lawyer_name, legal_capacity')
      .eq('case_id', caseId)
      .order('created_at'),
    supabase.from('settings').select('currency_code').maybeSingle(),
  ])

  if (!row) return baseContext()

  const c = row as unknown as Row
  const first = (opponents ?? [])[0] as Row | undefined
  const symbol = currencySymbol(text(settings?.currency_code))

  const nested = (key: string, field: string): string => {
    const value = c[key] as Row | null
    return value ? text(value[field]) : ''
  }

  return {
    ...(await baseContext()),
    ...clientContext(c.clients as Row | null),

    'case.internal_no':        text(c.internal_no),
    'case.court_case_no':      text(c.court_case_no),
    'case.title':              text(c.title),
    'case.type':               nested('case_types', 'name_ar'),
    'case.court':              nested('courts', 'name_ar'),
    'case.governorate':        text(c.governorate),
    'case.degree':             labelOf(LITIGATION_DEGREE_LABELS, text(c.litigation_degree), ''),
    'case.status':             labelOf(CASE_STATUS_LABELS, text(c.status), ''),
    'case.registered_at':      c.registered_at ? formatDate(String(c.registered_at)) : '',
    'case.first_hearing_at':   c.first_hearing_at ? formatDate(String(c.first_hearing_at)) : '',
    'case.claim_amount':       c.claim_amount === null || c.claim_amount === undefined
                                 ? '' : formatMoney(Number(c.claim_amount), symbol),
    'case.claim_arose_at':     c.claim_arose_at ? formatDate(String(c.claim_arose_at)) : '',
    'case.description':        text(c.description),
    'case.claim_requests':     text(c.claim_requests),
    'case.property_description': text(c.property_description),
    'case.lawyer':             nested('responsible', 'full_name'),

    'opponent.name':           text(first?.name),
    'opponent.national_id':    text(first?.national_id),
    'opponent.occupation':     text(first?.occupation),
    'opponent.workplace':      text(first?.workplace),
    'opponent.address':        text(first?.address),
    'opponent.lawyer_name':    text(first?.lawyer_name),
    'opponent.legal_capacity': text(first?.legal_capacity),
    'opponents.all':           (opponents ?? []).map((o) => text((o as Row).name)).join('، '),
  }
}
