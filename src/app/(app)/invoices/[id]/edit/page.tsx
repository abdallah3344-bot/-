import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requirePermission } from '@/lib/auth/session'
import { getInvoice } from '@/modules/finance/queries'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { InvoiceForm } from '@/modules/finance/components/invoice-form'
import { currencySymbol } from '@/lib/constants/currencies'

export const metadata: Metadata = { title: 'تعديل الفاتورة' }

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePermission('invoices', 'update')
  const { id } = await params

  const { invoice, items, settings } = await getInvoice(id)
  if (!invoice) notFound()

  const supabase = await createClient()
  const [clientsRes, casesRes] = await Promise.all([
    supabase.from('clients').select('id, name').is('deleted_at', null).order('name').limit(1000),
    supabase.from('cases').select('id, title, internal_no').is('deleted_at', null)
      .order('created_at', { ascending: false }).limit(1000),
  ])

  return (
    <>
      <PageHeader title={`تعديل الفاتورة ${String(invoice.invoice_no)}`} />
      <div className="max-w-4xl">
        <InvoiceForm
          options={{ clients: clientsRes.data ?? [], cases: casesRes.data ?? [] }}
          defaultTaxRate={Number(settings?.tax_rate ?? 0)}
          taxEnabled={Boolean(settings?.tax_enabled)}
          currencySymbol={currencySymbol(settings?.currency_code as string | null)}
          defaults={{
            id: String(invoice.id),
            clientId: String(invoice.client_id),
            caseId: invoice.case_id ? String(invoice.case_id) : null,
            issueDate: String(invoice.issue_date),
            dueDate: invoice.due_date ? String(invoice.due_date) : null,
            discount: String(invoice.discount ?? '0'),
            taxRate: String(invoice.tax_rate ?? '0'),
            status: String(invoice.status),
            notes: invoice.notes ? String(invoice.notes) : null,
            items: (items as { description: string; quantity: number; unit_price: number }[])
              .map((item) => ({
                description: item.description,
                quantity: String(item.quantity),
                unitPrice: String(item.unit_price),
              })),
          }}
        />
      </div>
    </>
  )
}
