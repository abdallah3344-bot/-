'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { ExpenseDialog, type ExpenseOptions } from './expense-dialog'
import { deleteExpenseAction } from '../actions'
import type { ExpenseRow } from '../queries'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { DataTable, type Column } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { formatDate, formatMoney } from '@/lib/utils'

type Props = {
  rows: ExpenseRow[]
  options: ExpenseOptions
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  currencySymbol: string
}

export function ExpensesView({
  rows, options, canCreate, canUpdate, canDelete, currencySymbol,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Record<string, string | null> | null>(null)

  const columns: Column<ExpenseRow>[] = [
    {
      key: 'category',
      header: 'نوع المصروف',
      cell: (row) => (
        <span className="block">
          <span className="block font-medium">
            {row.expense_categories?.name_ar ?? 'غير مصنّف'}
          </span>
          <span className="block text-xs text-muted-foreground">{formatDate(row.spent_at)}</span>
        </span>
      ),
    },
    {
      key: 'description',
      header: 'البيان',
      hideBelow: 'md',
      cell: (row) => (
        <span className="block max-w-64 truncate text-sm">{row.description ?? '—'}</span>
      ),
    },
    {
      key: 'case',
      header: 'القضية',
      hideBelow: 'lg',
      cell: (row) =>
        row.cases ? (
          <Link href={`/cases/${row.cases.id}`}
                className="block max-w-40 truncate text-sm hover:text-gold-600">
            {row.cases.title}
          </Link>
        ) : <span className="text-xs text-muted-foreground">—</span>,
    },
    {
      key: 'billable',
      header: 'قابل للتحصيل',
      hideBelow: 'lg',
      cell: (row) => (
        <Badge variant={row.is_billable ? 'info' : 'muted'}>
          {row.is_billable ? 'نعم' : 'على المكتب'}
        </Badge>
      ),
    },
    {
      key: 'amount',
      header: 'المبلغ',
      align: 'end',
      cell: (row) => (
        <span className="text-sm font-semibold tabular text-danger">
          {formatMoney(row.amount, currencySymbol)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      cell: (row) =>
        canUpdate || canDelete ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"
                      aria-label={`إجراءات مصروف ${formatDate(row.spent_at)}`}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canUpdate ? (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    setEditing({
                      id: row.id, categoryId: row.category_id, caseId: row.case_id,
                      clientId: row.client_id, amount: String(row.amount),
                      spentAt: row.spent_at, description: row.description,
                      receiptRef: row.receipt_ref,
                      isBillable: row.is_billable ? 'true' : 'false',
                    })
                    setOpen(true)
                  }}
                >
                  <Pencil />
                  تعديل المصروف
                </DropdownMenuItem>
              ) : null}
              {canDelete ? (
                <>
                  <DropdownMenuSeparator />
                  <ConfirmDialog
                    title="حذف المصروف"
                    description="سيتم حذف هذا المصروف من سجلات المكتب وكشف حساب العميل."
                    confirmLabel="حذف المصروف"
                    action={() => deleteExpenseAction(row.id)}
                    onDone={() => router.refresh()}
                    trigger={
                      <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
                        <Trash2 />
                        حذف المصروف
                      </DropdownMenuItem>
                    }
                  />
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null,
    },
  ]

  return (
    <>
      {canCreate ? (
        <div className="mb-4 no-print">
          <Button onClick={() => { setEditing(null); setOpen(true) }}>
            <Plus className="size-4" />
            تسجيل مصروف
          </Button>
        </div>
      ) : null}

      <DataTable
        rows={rows} columns={columns} rowKey={(row) => row.id}
        emptyIcon="TrendingDown"
        emptyTitle="لا توجد مصروفات"
        emptyDescription="سجّل رسوم المحاكم والتبليغات والخبرة وغيرها، واربطها بالقضية والعميل."
        emptyAction={
          canCreate ? (
            <Button size="sm" onClick={() => { setEditing(null); setOpen(true) }}>
              <Plus className="size-4" />
              تسجيل مصروف
            </Button>
          ) : null
        }
      />

      <ExpenseDialog open={open} onOpenChange={setOpen} options={options} defaults={editing} />
    </>
  )
}
