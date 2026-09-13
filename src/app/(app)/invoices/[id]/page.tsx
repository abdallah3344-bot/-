import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Pencil, HandCoins } from 'lucide-react'
import { requirePermission } from '@/lib/auth/session'
import { getInvoice } from '@/modules/finance/queries'
import { PageHeader } from '@/components/shared/page-header'
import { InvoiceSheet } from '@/modules/finance/components/invoice-sheet'
import { PrintButton } from '@/components/shared/print-button'
import { AutoPrint } from '@/components/shared/auto-print'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'عرض الفاتورة' }

export default async function InvoiceDetailPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ print?: string }>
}) {
  const user = await requirePermission('invoices', 'view')
  const [{ id }, { print }] = await Promise.all([params, searchParams])

  const { invoice, items, payments, settings } = await getInvoice(id)
  if (!invoice) notFound()

  const canPrint = user.permissions.can('invoices', 'print')

  return (
    <>
      <PageHeader
        title={`الفاتورة ${String(invoice.invoice_no)}`}
        description="الطباعة تُخرج الورقة نظيفة بحجم A4 بدون القائمة الجانبية"
      >
        {canPrint ? <PrintButton label="طباعة / حفظ PDF" /> : null}
        {user.permissions.can('payments', 'create') ? (
          <Button variant="outline" asChild>
            <Link href={`/payments?invoice=${id}`}>
              <HandCoins className="size-4" />
              تسجيل دفعة
            </Link>
          </Button>
        ) : null}
        {user.permissions.can('invoices', 'update') ? (
          <Button asChild>
            <Link href={`/invoices/${id}/edit`}>
              <Pencil className="size-4" />
              تعديل
            </Link>
          </Button>
        ) : null}
      </PageHeader>

      {print === '1' && canPrint ? <AutoPrint /> : null}

      <div className="max-w-4xl">
        <InvoiceSheet
          invoice={invoice}
          items={items as never}
          payments={payments as never}
          settings={settings}
        />
      </div>
    </>
  )
}
