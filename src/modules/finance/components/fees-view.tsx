'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Pencil } from 'lucide-react'
import { FeeDialog } from './fee-dialog'
import type { CaseFeeRow } from '../queries'
import { DataTable, type Column } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatMoney } from '@/lib/utils'

type Props = {
  rows: CaseFeeRow[]
  paidByCase: Record<string, number>
  cases: { id: string; title: string; internal_no: string }[]
  canCreate: boolean
  canUpdate: boolean
  currencySymbol: string
}

export function FeesView({
  rows, paidByCase, cases, canCreate, canUpdate, currencySymbol,
}: Props) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Record<string, string | null> | null>(null)

  const columns: Column<CaseFeeRow>[] = [
    {
      key: 'case',
      header: 'القضية',
      cell: (row) =>
        row.cases ? (
          <span className="block min-w-0">
            <Link href={`/cases/${row.cases.id}`}
                  className="block truncate font-medium hover:text-gold-600">
              {row.cases.title}
            </Link>
            <span className="block text-xs text-muted-foreground tabular">
              {row.cases.internal_no}
            </span>
          </span>
        ) : '—',
    },
    {
      key: 'client',
      header: 'العميل',
      hideBelow: 'sm',
      cell: (row) => <span className="text-sm">{row.cases?.clients?.name ?? '—'}</span>,
    },
    {
      key: 'total',
      header: 'قيمة الأتعاب',
      align: 'end',
      cell: (row) => (
        <span className="text-sm font-medium tabular">
          {formatMoney(row.total_amount, currencySymbol)}
        </span>
      ),
    },
    {
      key: 'advance',
      header: 'الدفعة المقدمة',
      align: 'end',
      hideBelow: 'md',
      cell: (row) => (
        <span className="text-sm tabular">{formatMoney(row.advance_amount, currencySymbol)}</span>
      ),
    },
    {
      key: 'installments',
      header: 'الأقساط',
      align: 'center',
      hideBelow: 'lg',
      cell: (row) =>
        row.installments_count > 0 ? (
          <span className="text-sm tabular">
            {row.installments_count} × {formatMoney(row.installment_amount, currencySymbol)}
          </span>
        ) : (
          <Badge variant="muted">دفعة واحدة</Badge>
        ),
    },
    {
      key: 'paid',
      header: 'المدفوع',
      align: 'end',
      cell: (row) => (
        <span className="text-sm tabular text-emerald-700 dark:text-emerald-400">
          {formatMoney(paidByCase[row.case_id] ?? 0, currencySymbol)}
        </span>
      ),
    },
    {
      key: 'remaining',
      header: 'المتبقي',
      align: 'end',
      cell: (row) => {
        const remaining = Number(row.total_amount) - (paidByCase[row.case_id] ?? 0)
        return (
          <span className={`text-sm font-semibold tabular ${remaining > 0 ? 'text-danger' : 'text-emerald-700 dark:text-emerald-400'}`}>
            {formatMoney(remaining, currencySymbol)}
          </span>
        )
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      cell: (row) =>
        canUpdate ? (
          <Button
            variant="ghost" size="icon"
            aria-label={`تعديل أتعاب ${row.cases?.title ?? ''}`}
            onClick={() => {
              setEditing({
                caseId: row.case_id,
                totalAmount: String(row.total_amount),
                advanceAmount: String(row.advance_amount),
                installmentsCount: String(row.installments_count),
                notes: row.notes,
              })
              setOpen(true)
            }}
          >
            <Pencil className="size-4" />
          </Button>
        ) : null,
    },
  ]

  return (
    <>
      {canCreate ? (
        <div className="mb-4 no-print">
          <Button onClick={() => { setEditing(null); setOpen(true) }}>
            <Plus className="size-4" />
            تحديد أتعاب قضية
          </Button>
        </div>
      ) : null}

      <DataTable
        rows={rows} columns={columns} rowKey={(row) => row.id}
        emptyIcon="Banknote"
        emptyTitle="لا توجد أتعاب مسجّلة"
        emptyDescription="حدّد أتعاب كل قضية ودفعتها المقدمة وأقساطها لتتبّع المستحقات."
        emptyAction={
          canCreate ? (
            <Button size="sm" onClick={() => { setEditing(null); setOpen(true) }}>
              <Plus className="size-4" />
              تحديد أتعاب قضية
            </Button>
          ) : null
        }
      />

      <FeeDialog
        open={open} onOpenChange={setOpen} cases={cases}
        currencySymbol={currencySymbol} defaults={editing}
      />
    </>
  )
}
