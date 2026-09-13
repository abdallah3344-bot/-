import type { Metadata } from 'next'
import { requirePermission } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { InvoiceForm } from '@/modules/finance/components/invoice-form'

export const metadata: Metadata = { title: 'فاتورة جديدة' }

export default async function NewInvoicePage() {
  await requirePermission('invoices', 'create')
  const supabase = await createClient()

  const [clientsRes, casesRes, settingsRes] = await Promise.all([
    supabase.from('clients').select('id, name').is('deleted_at', null).order('name').limit(1000),
    supabase.from('cases').select('id, title, internal_no').is('deleted_at', null)
      .order('created_at', { ascending: false }).limit(1000),
    supabase.from('settings').select('tax_enabled, tax_rate, currency_symbol').maybeSingle(),
  ])

  return (
    <>
      <PageHeader
        title="فاتورة جديدة"
        description="سيُولَّد رقم الفاتورة تلقائيًا، وتُحسب الإجماليات في قاعدة البيانات"
      />
      <div className="max-w-4xl">
        <InvoiceForm
          options={{ clients: clientsRes.data ?? [], cases: casesRes.data ?? [] }}
          defaultTaxRate={Number(settingsRes.data?.tax_rate ?? 0)}
          taxEnabled={Boolean(settingsRes.data?.tax_enabled)}
          currencySymbol={settingsRes.data?.currency_symbol ?? 'ر.س'}
        />
      </div>
    </>
  )
}
