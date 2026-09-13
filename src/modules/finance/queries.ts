import 'server-only'

import { createClient } from '@/lib/supabase/server'
import {
  DEFAULT_PAGE_SIZE, pageRange, orIlike, readParam, readPage, type SearchParams,
} from '@/lib/query'

// ---------------- الأتعاب ----------------
export type CaseFeeRow = {
  id: string
  case_id: string
  total_amount: string | number
  advance_amount: string | number
  installments_count: number
  installment_amount: string | number
  notes: string | null
  cases: { id: string; title: string; internal_no: string; clients: { id: string; name: string } | null } | null
}

export async function listCaseFees(params: SearchParams) {
  const supabase = await createClient()
  const page = readPage(params)
  const { from, to } = pageRange(page)

  const { data, count, error } = await supabase
    .from('case_fees')
    .select(`
      id, case_id, total_amount, advance_amount, installments_count, installment_amount, notes,
      cases:case_id(id, title, internal_no, clients:client_id(id, name))
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(`تعذّر جلب الأتعاب: ${error.message}`)

  return {
    rows: (data ?? []) as unknown as CaseFeeRow[],
    total: count ?? 0,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  }
}

export async function getInstallments(caseFeeId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('fee_installments')
    .select('id, seq, amount, due_date, paid_amount, status')
    .eq('case_fee_id', caseFeeId)
    .order('seq')

  if (error) throw new Error(`تعذّر جلب الأقساط: ${error.message}`)
  return data ?? []
}

/** المدفوع فعليًا على كل قضية — لحساب المتبقي من الأتعاب. */
export async function getPaidByCaseMap(caseIds: string[]) {
  if (caseIds.length === 0) return new Map<string, number>()
  const supabase = await createClient()
  const { data } = await supabase
    .from('payments')
    .select('case_id, amount')
    .in('case_id', caseIds)
    .is('deleted_at', null)

  const map = new Map<string, number>()
  for (const row of data ?? []) {
    if (!row.case_id) continue
    map.set(row.case_id, (map.get(row.case_id) ?? 0) + Number(row.amount ?? 0))
  }
  return map
}

// ---------------- الفواتير ----------------
export type InvoiceRow = {
  id: string
  invoice_no: string
  issue_date: string
  due_date: string | null
  subtotal: string | number
  discount: string | number
  tax_rate: string | number
  tax_amount: string | number
  total: string | number
  paid_amount: string | number
  status: string
  client_id: string
  case_id: string | null
  clients: { id: string; name: string } | null
  cases: { id: string; title: string; internal_no: string } | null
}

export async function listInvoices(params: SearchParams) {
  const supabase = await createClient()
  const page = readPage(params)
  const { from, to } = pageRange(page)

  const term = readParam(params, 'q')
  const status = readParam(params, 'status')
  const clientId = readParam(params, 'client')

  let query = supabase
    .from('invoices')
    .select(`
      id, invoice_no, issue_date, due_date, subtotal, discount, tax_rate,
      tax_amount, total, paid_amount, status, client_id, case_id,
      clients:client_id(id, name),
      cases:case_id(id, title, internal_no)
    `, { count: 'exact' })
    .is('deleted_at', null)

  if (term) query = query.or(orIlike(['invoice_no'], term))
  if (status === 'unpaid') query = query.in('status', ['issued', 'partial', 'overdue'])
  else if (status) query = query.eq('status', status)
  if (clientId) query = query.eq('client_id', clientId)

  const { data, count, error } = await query
    .order('issue_date', { ascending: false })
    .range(from, to)

  if (error) throw new Error(`تعذّر جلب الفواتير: ${error.message}`)

  return {
    rows: (data ?? []) as unknown as InvoiceRow[],
    total: count ?? 0,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  }
}

export async function getInvoice(id: string) {
  const supabase = await createClient()

  const [invoiceRes, itemsRes, paymentsRes, settingsRes] = await Promise.all([
    supabase.from('invoices')
      .select(`
        id, invoice_no, issue_date, due_date, subtotal, discount, tax_rate,
        tax_amount, total, paid_amount, status, notes, client_id, case_id,
        clients:client_id(id, name, client_no, address, phone, email, national_id),
        cases:case_id(id, title, internal_no)
      `)
      .eq('id', id).is('deleted_at', null).maybeSingle(),
    supabase.from('invoice_items')
      .select('id, description, quantity, unit_price, line_total, sort_order')
      .eq('invoice_id', id).order('sort_order'),
    supabase.from('payments')
      .select('id, receipt_no, amount, method, paid_at')
      .eq('invoice_id', id).is('deleted_at', null).order('paid_at'),
    supabase.from('settings').select('*').maybeSingle(),
  ])

  if (invoiceRes.error) throw new Error(`تعذّر جلب الفاتورة: ${invoiceRes.error.message}`)

  return {
    invoice: invoiceRes.data as Record<string, unknown> | null,
    items: itemsRes.data ?? [],
    payments: paymentsRes.data ?? [],
    settings: settingsRes.data as Record<string, unknown> | null,
  }
}

// ---------------- المقبوضات ----------------
export type PaymentRow = {
  id: string
  receipt_no: string
  amount: string | number
  method: string
  reference_no: string | null
  paid_at: string
  notes: string | null
  client_id: string
  case_id: string | null
  invoice_id: string | null
  clients: { id: string; name: string } | null
  cases: { id: string; title: string } | null
  invoices: { id: string; invoice_no: string } | null
  receiver: { id: string; full_name: string } | null
}

export async function listPayments(params: SearchParams) {
  const supabase = await createClient()
  const page = readPage(params)
  const { from, to } = pageRange(page)

  const term = readParam(params, 'q')
  const method = readParam(params, 'method')
  const clientId = readParam(params, 'client')

  let query = supabase
    .from('payments')
    .select(`
      id, receipt_no, amount, method, reference_no, paid_at, notes,
      client_id, case_id, invoice_id,
      clients:client_id(id, name),
      cases:case_id(id, title),
      invoices:invoice_id(id, invoice_no),
      receiver:received_by(id, full_name)
    `, { count: 'exact' })
    .is('deleted_at', null)

  if (term) query = query.or(orIlike(['receipt_no', 'reference_no'], term))
  if (method) query = query.eq('method', method)
  if (clientId) query = query.eq('client_id', clientId)

  const { data, count, error } = await query
    .order('paid_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(`تعذّر جلب المقبوضات: ${error.message}`)

  return {
    rows: (data ?? []) as unknown as PaymentRow[],
    total: count ?? 0,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  }
}

export async function getPaymentReceipt(id: string) {
  const supabase = await createClient()
  const [paymentRes, settingsRes] = await Promise.all([
    supabase.from('payments')
      .select(`
        id, receipt_no, amount, method, reference_no, paid_at, notes,
        clients:client_id(id, name, client_no, phone),
        cases:case_id(id, title, internal_no),
        invoices:invoice_id(id, invoice_no),
        receiver:received_by(id, full_name)
      `)
      .eq('id', id).is('deleted_at', null).maybeSingle(),
    supabase.from('settings').select('*').maybeSingle(),
  ])

  return {
    payment: paymentRes.data as Record<string, unknown> | null,
    settings: settingsRes.data as Record<string, unknown> | null,
  }
}

// ---------------- المصروفات ----------------
export type ExpenseRow = {
  id: string
  amount: string | number
  spent_at: string
  description: string | null
  receipt_ref: string | null
  is_billable: boolean
  case_id: string | null
  client_id: string | null
  category_id: string | null
  expense_categories: { id: string; name_ar: string } | null
  cases: { id: string; title: string } | null
  clients: { id: string; name: string } | null
}

export async function listExpenses(params: SearchParams) {
  const supabase = await createClient()
  const page = readPage(params)
  const { from, to } = pageRange(page)

  const term = readParam(params, 'q')
  const category = readParam(params, 'category')
  const caseId = readParam(params, 'case')

  let query = supabase
    .from('expenses')
    .select(`
      id, amount, spent_at, description, receipt_ref, is_billable,
      case_id, client_id, category_id,
      expense_categories:category_id(id, name_ar),
      cases:case_id(id, title),
      clients:client_id(id, name)
    `, { count: 'exact' })
    .is('deleted_at', null)

  if (term) query = query.or(orIlike(['description', 'receipt_ref'], term))
  if (category) query = query.eq('category_id', category)
  if (caseId) query = query.eq('case_id', caseId)

  const { data, count, error } = await query
    .order('spent_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(`تعذّر جلب المصروفات: ${error.message}`)

  return {
    rows: (data ?? []) as unknown as ExpenseRow[],
    total: count ?? 0,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  }
}

// ---------------- الحسابات ----------------
export async function listAccounts() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, account_type, bank_name, account_number, iban, opening_balance, is_active')
    .is('deleted_at', null)
    .order('created_at')

  if (error) throw new Error(`تعذّر جلب الحسابات: ${error.message}`)
  return data ?? []
}

/** ملخّص مالي عام للمكتب. */
export async function getFinanceSummary() {
  const supabase = await createClient()

  const [payments, expenses, invoices, fees] = await Promise.all([
    supabase.from('payments').select('amount, account_id').is('deleted_at', null),
    supabase.from('expenses').select('amount, account_id').is('deleted_at', null),
    supabase.from('invoices').select('total, paid_amount, status').is('deleted_at', null),
    supabase.from('case_fees').select('total_amount'),
  ])

  const income = (payments.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0)
  const spent = (expenses.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0)
  const feesTotal = (fees.data ?? []).reduce((s, r) => s + Number(r.total_amount ?? 0), 0)

  const receivables = (invoices.data ?? [])
    .filter((i) => !['cancelled', 'draft'].includes(i.status))
    .reduce((s, i) => s + (Number(i.total ?? 0) - Number(i.paid_amount ?? 0)), 0)

  // رصيد كل حساب = الافتتاحي + المقبوضات − المصروفات المسجّلة عليه
  const byAccount = new Map<string, { in: number; out: number }>()
  for (const row of payments.data ?? []) {
    if (!row.account_id) continue
    const entry = byAccount.get(row.account_id) ?? { in: 0, out: 0 }
    entry.in += Number(row.amount ?? 0)
    byAccount.set(row.account_id, entry)
  }
  for (const row of expenses.data ?? []) {
    if (!row.account_id) continue
    const entry = byAccount.get(row.account_id) ?? { in: 0, out: 0 }
    entry.out += Number(row.amount ?? 0)
    byAccount.set(row.account_id, entry)
  }

  return { income, spent, feesTotal, receivables, net: income - spent, byAccount }
}

/** كشف حساب عميل: كل فواتيره ومقبوضاته ومصروفاته مرتبة زمنيًا. */
export async function getClientStatement(clientId: string) {
  const supabase = await createClient()

  const [invoices, payments, expenses, client] = await Promise.all([
    supabase.from('invoices').select('id, invoice_no, issue_date, total, status')
      .eq('client_id', clientId).is('deleted_at', null).neq('status', 'cancelled'),
    supabase.from('payments').select('id, receipt_no, paid_at, amount, method')
      .eq('client_id', clientId).is('deleted_at', null),
    supabase.from('expenses').select('id, spent_at, amount, description, is_billable')
      .eq('client_id', clientId).is('deleted_at', null).eq('is_billable', true),
    supabase.from('clients').select('id, name, client_no, phone, address')
      .eq('id', clientId).maybeSingle(),
  ])

  type Line = {
    date: string
    kind: 'invoice' | 'payment' | 'expense'
    reference: string
    description: string
    debit: number
    credit: number
  }

  const lines: Line[] = []

  for (const i of invoices.data ?? []) {
    lines.push({
      date: i.issue_date, kind: 'invoice', reference: i.invoice_no,
      description: 'فاتورة أتعاب', debit: Number(i.total ?? 0), credit: 0,
    })
  }
  for (const e of expenses.data ?? []) {
    lines.push({
      date: e.spent_at, kind: 'expense', reference: '—',
      description: e.description ?? 'مصروف على العميل',
      debit: Number(e.amount ?? 0), credit: 0,
    })
  }
  for (const p of payments.data ?? []) {
    lines.push({
      date: p.paid_at, kind: 'payment', reference: p.receipt_no,
      description: 'دفعة مستلمة', debit: 0, credit: Number(p.amount ?? 0),
    })
  }

  lines.sort((a, b) => a.date.localeCompare(b.date))

  let balance = 0
  const withBalance = lines.map((line) => {
    balance += line.debit - line.credit
    return { ...line, balance }
  })

  return {
    client: client.data,
    lines: withBalance,
    totals: {
      debit: lines.reduce((s, l) => s + l.debit, 0),
      credit: lines.reduce((s, l) => s + l.credit, 0),
      balance,
    },
  }
}
