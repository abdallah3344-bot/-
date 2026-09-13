import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Scale } from 'lucide-react'
import { requirePermission } from '@/lib/auth/session'
import { getPaymentReceipt } from '@/modules/finance/queries'
import { PageHeader } from '@/components/shared/page-header'
import { PrintButton } from '@/components/shared/print-button'
import { formatDate, formatMoney } from '@/lib/utils'
import { PAYMENT_METHOD_LABELS, labelOf } from '@/lib/constants/enums'

export const metadata: Metadata = { title: 'إيصال قبض' }

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

/** تحويل المبلغ إلى كلمات عربية — يمنع التلاعب بالرقم في الإيصال الورقي. */
function amountInWords(amount: number): string {
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة',
                'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر',
                'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر']
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون']
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة',
                    'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة']

  function underThousand(n: number): string {
    if (n === 0) return ''
    const parts: string[] = []
    const h = Math.floor(n / 100)
    const rest = n % 100
    if (h > 0) parts.push(hundreds[h])
    if (rest > 0) {
      if (rest < 20) parts.push(ones[rest])
      else {
        const unit = rest % 10
        const ten = Math.floor(rest / 10)
        parts.push(unit > 0 ? `${ones[unit]} و${tens[ten]}` : tens[ten])
      }
    }
    return parts.join(' و')
  }

  const whole = Math.floor(Math.abs(amount))
  if (whole === 0) return 'صفر'

  const groups: string[] = []
  const millions = Math.floor(whole / 1_000_000)
  const thousands = Math.floor((whole % 1_000_000) / 1000)
  const rest = whole % 1000

  // تمييز العدد في العربية: 3-10 جمع قلّة، و11 فأكثر مفرد منصوب.
  function countOf(n: number, singular: string, dual: string, plural: string): string {
    if (n === 1) return singular
    if (n === 2) return dual
    if (n >= 3 && n <= 10) return `${underThousand(n)} ${plural}`
    return `${underThousand(n)} ${singular}`
  }

  if (millions > 0) groups.push(countOf(millions, 'مليون', 'مليونان', 'ملايين'))
  if (thousands > 0) groups.push(countOf(thousands, 'ألف', 'ألفان', 'آلاف'))
  if (rest > 0) groups.push(underThousand(rest))

  return groups.join(' و')
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
  const symbol = text(settings?.currency_symbol) || 'ر.س'
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
              <strong>{amountInWords(amount)} {symbol} لا غير</strong>
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
