import { Scale } from 'lucide-react'
import { formatDate, formatMoney } from '@/lib/utils'
import { INVOICE_STATUS_LABELS, PAYMENT_METHOD_LABELS, labelOf } from '@/lib/constants/enums'

type Settings = Record<string, unknown> | null

type Props = {
  invoice: Record<string, unknown>
  items: { id: string; description: string; quantity: number; unit_price: number; line_total: number }[]
  payments: { id: string; receipt_no: string; amount: number; method: string; paid_at: string }[]
  settings: Settings
}

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

/**
 * ورقة الفاتورة — مصمّمة للشاشة والطباعة معًا.
 * أنماط الطباعة في globals.css تُخفي الشريط الجانبي والترويسة
 * وتُزيل الظلال، فتخرج الورقة نظيفة على A4.
 */
export function InvoiceSheet({ invoice, items, payments, settings }: Props) {
  const client = invoice.clients as Record<string, unknown> | null
  const relatedCase = invoice.cases as Record<string, unknown> | null
  const symbol = text(settings?.currency_symbol) || 'ر.س'

  const total = Number(invoice.total ?? 0)
  const paid = Number(invoice.paid_amount ?? 0)
  const remaining = total - paid

  return (
    <div className="print-sheet rounded-[var(--radius-app)] border border-border bg-surface p-6 sm:p-10">
      {/* الترويسة */}
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
              {settings?.office_email ? (
                <p dir="ltr" style={{ textAlign: 'start' }}>{text(settings.office_email)}</p>
              ) : null}
              {settings?.tax_number ? <p>الرقم الضريبي: {text(settings.tax_number)}</p> : null}
            </div>
          </div>
        </div>

        <div className="text-end">
          <h1 className="text-2xl font-bold">فاتورة</h1>
          <p className="mt-1 text-sm tabular">{text(invoice.invoice_no)}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            تاريخ الإصدار: {formatDate(text(invoice.issue_date))}
          </p>
          {invoice.due_date ? (
            <p className="text-xs text-muted-foreground">
              تاريخ الاستحقاق: {formatDate(text(invoice.due_date))}
            </p>
          ) : null}
          <p className="mt-2 inline-block rounded-full bg-surface-muted px-2.5 py-0.5 text-xs">
            {labelOf(INVOICE_STATUS_LABELS, text(invoice.status))}
          </p>
        </div>
      </header>

      {/* بيانات العميل */}
      <section className="mb-8 grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-semibold text-muted-foreground">فاتورة إلى</h3>
          <p className="font-medium">{text(client?.name)}</p>
          <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {client?.client_no ? <p className="tabular">رقم العميل: {text(client.client_no)}</p> : null}
            {client?.national_id ? (
              <p className="tabular">الهوية/السجل: {text(client.national_id)}</p>
            ) : null}
            {client?.address ? <p>{text(client.address)}</p> : null}
            {client?.phone ? (
              <p dir="ltr" className="tabular" style={{ textAlign: 'start' }}>{text(client.phone)}</p>
            ) : null}
          </div>
        </div>

        {relatedCase ? (
          <div>
            <h3 className="mb-2 text-xs font-semibold text-muted-foreground">بخصوص القضية</h3>
            <p className="font-medium">{text(relatedCase.title)}</p>
            <p className="mt-1 text-xs text-muted-foreground tabular">
              {text(relatedCase.internal_no)}
            </p>
          </div>
        ) : null}
      </section>

      {/* البنود */}
      <section className="mb-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-border bg-surface-muted">
              <th className="p-2.5 text-start text-xs font-semibold">#</th>
              <th className="p-2.5 text-start text-xs font-semibold">وصف الخدمة</th>
              <th className="p-2.5 text-end text-xs font-semibold">الكمية</th>
              <th className="p-2.5 text-end text-xs font-semibold">سعر الوحدة</th>
              <th className="p-2.5 text-end text-xs font-semibold">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} className="border-b border-border">
                <td className="p-2.5 text-muted-foreground tabular">{index + 1}</td>
                <td className="p-2.5">{item.description}</td>
                <td className="p-2.5 text-end tabular">{Number(item.quantity)}</td>
                <td className="p-2.5 text-end tabular">
                  {formatMoney(item.unit_price, symbol)}
                </td>
                <td className="p-2.5 text-end font-medium tabular">
                  {formatMoney(item.line_total, symbol)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* الإجماليات */}
      <section className="mb-8 flex justify-start">
        <dl className="w-full max-w-sm space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">المجموع الفرعي</dt>
            <dd className="tabular">{formatMoney(invoice.subtotal as number, symbol)}</dd>
          </div>
          {Number(invoice.discount ?? 0) > 0 ? (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">الخصم</dt>
              <dd className="tabular">− {formatMoney(invoice.discount as number, symbol)}</dd>
            </div>
          ) : null}
          {Number(invoice.tax_rate ?? 0) > 0 ? (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">
                الضريبة ({Number(invoice.tax_rate)}%)
              </dt>
              <dd className="tabular">{formatMoney(invoice.tax_amount as number, symbol)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
            <dt>الإجمالي</dt>
            <dd className="tabular">{formatMoney(total, symbol)}</dd>
          </div>
          <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
            <dt>المدفوع</dt>
            <dd className="tabular">{formatMoney(paid, symbol)}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>المتبقي</dt>
            <dd className="tabular">{formatMoney(remaining, symbol)}</dd>
          </div>
        </dl>
      </section>

      {/* الدفعات */}
      {payments.length > 0 ? (
        <section className="mb-8">
          <h3 className="mb-2 text-xs font-semibold text-muted-foreground">الدفعات المستلمة</h3>
          <ul className="space-y-1 text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex justify-between border-b border-border py-1.5">
                <span>
                  <span className="tabular">{p.receipt_no}</span>
                  <span className="text-muted-foreground">
                    {' '}· {labelOf(PAYMENT_METHOD_LABELS, p.method)} · {formatDate(p.paid_at)}
                  </span>
                </span>
                <span className="tabular font-medium">{formatMoney(p.amount, symbol)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* التذييل */}
      <footer className="space-y-3 border-t border-border pt-5 text-xs text-muted-foreground">
        {invoice.notes ? <p>{text(invoice.notes)}</p> : null}
        {settings?.invoice_notes ? <p>{text(settings.invoice_notes)}</p> : null}

        {settings?.bank_name || settings?.bank_iban ? (
          <div>
            <p className="font-semibold text-foreground">بيانات التحويل البنكي</p>
            {settings.bank_name ? <p>البنك: {text(settings.bank_name)}</p> : null}
            {settings.bank_account_name ? (
              <p>اسم الحساب: {text(settings.bank_account_name)}</p>
            ) : null}
            {settings.bank_iban ? (
              <p dir="ltr" className="tabular" style={{ textAlign: 'start' }}>
                IBAN: {text(settings.bank_iban)}
              </p>
            ) : null}
          </div>
        ) : null}
      </footer>
    </div>
  )
}
