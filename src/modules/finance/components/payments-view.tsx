'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, MoreHorizontal, Pencil, Trash2, Printer } from 'lucide-react'
import { PaymentDialog, type PaymentOptions } from './payment-dialog'
import { deletePaymentAction } from '../actions'
import type { PaymentRow } from '../queries'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { DataTable, type Column } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { formatDate, formatMoney } from '@/lib/utils'
import { PAYMENT_METHOD_LABELS, labelOf } from '@/lib/constants/enums'

type Props = {
  rows: PaymentRow[]
  options: PaymentOptions
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  canPrint: boolean
  currencySymbol: string
}

export function PaymentsView({
  rows, options, canCreate, canUpdate, canDelete, canPrint, currencySymbol,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Record<string, string | null> | null>(null)

  // الوصول من صفحة الفاتورة بـ ?invoice=... يفتح النموذج مباشرة
  useEffect(() => {
    const invoiceId = searchParams.get('invoice')
    if (invoiceId) {
      setEditing({ invoiceId })
      setOpen(true)
    }
  }, [searchParams])

  const columns: Column<PaymentRow>[] = [
    {
      key: 'receipt',
      header: 'رقم الإيصال',
      cell: (row) => (
        <span className="block">
          <span className="block font-medium tabular">{row.receipt_no}</span>
          <span className="block text-xs text-muted-foreground">{formatDate(row.paid_at)}</span>
        </span>
      ),
    },
    {
      key: 'client',
      header: 'العميل',
      cell: (row) =>
        row.clients ? (
          <Link href={`/clients/${row.clients.id}`} className="text-sm hover:text-gold-600">
            {row.clients.name}
          </Link>
        ) : '—',
    },
    {
      key: 'invoice',
      header: 'الفاتورة',
      hideBelow: 'md',
      cell: (row) =>
        row.invoices ? (
          <Link href={`/invoices/${row.invoices.id}`}
                className="text-sm tabular hover:text-gold-600">
            {row.invoices.invoice_no}
          </Link>
        ) : <span className="text-xs text-muted-foreground">—</span>,
    },
    {
      key: 'method',
      header: 'طريقة الدفع',
      hideBelow: 'lg',
      cell: (row) => (
        <span className="block">
          <Badge variant="outline">{labelOf(PAYMENT_METHOD_LABELS, row.method)}</Badge>
          {row.reference_no ? (
            <span className="mt-0.5 block text-xs text-muted-foreground tabular">
              {row.reference_no}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'المبلغ',
      align: 'end',
      cell: (row) => (
        <span className="text-sm font-semibold tabular text-emerald-700 dark:text-emerald-400">
          {formatMoney(row.amount, currencySymbol)}
        </span>
      ),
    },
    {
      key: 'receiver',
      header: 'المستلم',
      hideBelow: 'lg',
      cell: (row) => <span className="text-sm">{row.receiver?.full_name ?? '—'}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`إجراءات ${row.receipt_no}`}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            {canPrint ? (
              <DropdownMenuItem asChild>
                <Link href={`/payments/${row.id}`}>
                  <Printer />
                  إيصال قبض
                </Link>
              </DropdownMenuItem>
            ) : null}

            {canUpdate ? (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault()
                  setEditing({
                    id: row.id, clientId: row.client_id, caseId: row.case_id,
                    invoiceId: row.invoice_id, amount: String(row.amount),
                    method: row.method, referenceNo: row.reference_no,
                    paidAt: row.paid_at, notes: row.notes,
                  })
                  setOpen(true)
                }}
              >
                <Pencil />
                تعديل الدفعة
              </DropdownMenuItem>
            ) : null}

            {canDelete ? (
              <>
                <DropdownMenuSeparator />
                <ConfirmDialog
                  title="حذف الدفعة"
                  description={`سيتم حذف الإيصال ${row.receipt_no} وإعادة احتساب الفاتورة المرتبطة.`}
                  confirmLabel="حذف الدفعة"
                  action={() => deletePaymentAction(row.id)}
                  onDone={() => router.refresh()}
                  trigger={
                    <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
                      <Trash2 />
                      حذف الدفعة
                    </DropdownMenuItem>
                  }
                />
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <>
      {canCreate ? (
        <div className="mb-4 no-print">
          <Button onClick={() => { setEditing(null); setOpen(true) }}>
            <Plus className="size-4" />
            تسجيل دفعة
          </Button>
        </div>
      ) : null}

      <DataTable
        rows={rows} columns={columns} rowKey={(row) => row.id}
        emptyIcon="HandCoins"
        emptyTitle="لا توجد مقبوضات"
        emptyDescription="سجّل الدفعات المستلمة من العملاء لتُحتسب على فواتيرهم تلقائيًا."
        emptyAction={
          canCreate ? (
            <Button size="sm" onClick={() => { setEditing(null); setOpen(true) }}>
              <Plus className="size-4" />
              تسجيل دفعة
            </Button>
          ) : null
        }
      />

      <PaymentDialog open={open} onOpenChange={setOpen} options={options} defaults={editing} />
    </>
  )
}
