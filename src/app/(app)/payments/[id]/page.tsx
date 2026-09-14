import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Scale } from 'lucide-react'
import { requirePermission } from '@/lib/auth/session'
import { getPaymentReceipt } from '@/modules/finance/queries'
import { PageHeader } from '@/components/shared/page-header'
import { PrintButton } from '@/components/shared/print-button'
import { formatDate, formatMoney } from '@/lib/utils'
import { amountInWords } from '@/lib/money'
import { currencySymbol } from '@/lib/constants/currencies'
import { PAYMENT_METHOD_LABELS, labelOf } from '@/lib/constants/enums'

export const metadata: Metadata = { title: 'إيصال قبض' }

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requirePermission('payments', 'view')
  const { id } = await params

  const { payment, settings } = await getPaymentReceipt(id)
  if (!payment) notFound()

  const client = payment.clients as Record<string, unknown> | null
  const relatedCase = payment.cases as Record<string, unknown> | null
  const invoice = payment.invoices as Record<string, unknown> | null
  const receiver = payment.receiver as Record<string, unknown> | null
  const currencyCode = text(settings?.currency_code) || undefined
  const symbol = currencySymbol(currencyCode)
  const amount = Number(payment.amount ?? 0)

  return (
    <>
      <PageHeader title={`إيصال قبض ${text(payment.receipt_no)}`}>
        {user.permissions.can('payments', 'print') ? (
          <PrintButton label="طباعة / حفظ PDF" />
        ) : null}
      </PageHeader>

      <div className="max-w-3xl">
        <div className="print-sheet rounded-[var(--radius-app)] border border-border bg-surface p-6 sm:p-10">
          <header className="mb-8 flex flex-wrap items-start justify-between gap-6 border-b border-border pb-6">
            <div className="flex items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-gold-400 overflow-hidden">
                {settings?.office_logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={text(settings.office_logo_url)} alt="" className="size-full object-cover" />
                ) : (
                  <Scale className="size-7" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold">{text(settings?.office_name) || 'مكتب المحاماة'}</h2>
                <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  {settings?.office_address ? <p>{text(settings.office_address)}</p> : null}
                  {settings?.office_phone ? (
                    <p dir="ltr" className="tabular" style={{ textAlign: 'start' }}>
                      {text(settings.office_phone)}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="text-end">
              <h1 className="text-2xl font-bold">سند قبض</h1>
              <p className="mt-1 text-sm tabular">{text(payment.receipt_no)}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                التاريخ: {formatDate(text(payment.paid_at))}
              </p>
            </div>
          </header>

          <section className="mb-8 space-y-4 text-sm">
            <p className="flex flex-wrap gap-2">
              <span className="text-muted-foreground">استلمنا من السيد/السادة:</span>
              <strong>{text(client?.name)}</strong>
            </p>

            <p className="flex flex-wrap items-baseline gap-2">
              <span className="text-muted-foreground">مبلغًا وقدره:</span>
              <strong className="text-lg tabular">{formatMoney(amount, symbol)}</strong>
            </p>

            <p className="rounded-lg bg-surface-muted p-3">
              <span className="text-muted-foreground">فقط: </span>
              <strong>{amountInWords(amount, currencyCode)} لا غير</strong>
            </p>

            <p className="flex flex-wrap gap-2">
              <span className="text-muted-foreground">وذلك عن:</span>
              <span>
                {relatedCase ? `قضية ${text(relatedCase.title)} (${text(relatedCase.internal_no)})` : null}
                {invoice ? `${relatedCase ? ' — ' : ''}فاتورة ${text(invoice.invoice_no)}` : null}
                {!relatedCase && !invoice ? 'أتعاب ومصروفات' : null}
              </span>
            </p>

            <p className="flex flex-wrap gap-2">
              <span className="text-muted-foreground">طريقة الدفع:</span>
              <span>
                {labelOf(PAYMENT_METHOD_LABELS, text(payment.method))}
                {payment.reference_no ? ` — مرجع: ${text(payment.reference_no)}` : ''}
              </span>
            </p>

            {payment.notes ? (
              <p className="text-muted-foreground">{text(payment.notes)}</p>
            ) : null}
          </section>

          <footer className="grid gap-8 border-t border-border pt-8 sm:grid-cols-2">
            <div>
              <p className="mb-10 text-xs text-muted-foreground">المستلم</p>
              <p className="border-t border-border pt-2 text-sm">
                {text(receiver?.full_name) || '................................'}
              </p>
            </div>
            <div>
              <p className="mb-10 text-xs text-muted-foreground">توقيع الدافع</p>
              <p className="border-t border-border pt-2 text-sm">
                ................................
              </p>
            </div>
          </footer>
        </div>
      </div>
    </>
  )
}
