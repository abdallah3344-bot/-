'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { ContractDialog } from './contract-dialog'
import type { LegalDocOptions } from './poa-dialog'
import { deleteContractAction } from '../actions'
import type { ContractRow } from '../queries'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { DataTable, type Column } from '@/components/shared/data-table'
import { ExpiryBadge } from '@/components/shared/expiry-badge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { formatMoney } from '@/lib/utils'
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_TONE, labelOf, toneOf } from '@/lib/constants/enums'

type Props = {
  rows: ContractRow[]
  options: LegalDocOptions
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  currencySymbol: string
}

export function ContractsView({
  rows, options, canCreate, canUpdate, canDelete, currencySymbol,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Record<string, string | null> | null>(null)

  const columns: Column<ContractRow>[] = [
    {
      key: 'title',
      header: 'العقد',
      cell: (row) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium">{row.title}</span>
          <span className="block text-xs text-muted-foreground tabular">{row.contract_no}</span>
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
      key: 'counterparty',
      header: 'الطرف الآخر',
      hideBelow: 'md',
      cell: (row) => <span className="text-sm">{row.counterparty ?? '—'}</span>,
    },
    {
      key: 'value',
      header: 'القيمة',
      align: 'end',
      hideBelow: 'md',
      cell: (row) => (
        <span className="text-sm font-medium tabular">
          {row.value !== null ? formatMoney(row.value, currencySymbol) : '—'}
        </span>
      ),
    },
    {
      key: 'end',
      header: 'تاريخ النهاية',
      cell: (row) => <ExpiryBadge date={row.end_date} />,
    },
    {
      key: 'lawyer',
      header: 'المحامي',
      hideBelow: 'lg',
      cell: (row) => <span className="text-sm">{row.lawyer?.full_name ?? '—'}</span>,
    },
    {
      key: 'status',
      header: 'الحالة',
      cell: (row) => (
        <Badge variant={toneOf(CONTRACT_STATUS_TONE, row.status)}>
          {labelOf(CONTRACT_STATUS_LABELS, row.status)}
        </Badge>
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
              <Button variant="ghost" size="icon" aria-label={`إجراءات ${row.title}`}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canUpdate ? (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    setEditing({
                      id: row.id, title: row.title, clientId: row.client_id,
                      counterparty: row.counterparty, contractType: row.contract_type,
                      startDate: row.start_date, endDate: row.end_date,
                      value: row.value !== null ? String(row.value) : null,
                      lawyerId: row.lawyer_id, status: row.status,
                      documentId: row.document_id, notes: row.notes,
                    })
                    setOpen(true)
                  }}
                >
                  <Pencil />
                  تعديل العقد
                </DropdownMenuItem>
              ) : null}
              {canDelete ? (
                <>
                  <DropdownMenuSeparator />
                  <ConfirmDialog
                    title="حذف العقد"
                    description={`سيتم حذف «${row.title}».`}
                    confirmLabel="حذف العقد"
                    action={() => deleteContractAction(row.id)}
                    onDone={() => router.refresh()}
                    trigger={
                      <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
                        <Trash2 />
                        حذف العقد
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
            إضافة عقد
          </Button>
        </div>
      ) : null}

      <DataTable
        rows={rows} columns={columns} rowKey={(row) => row.id}
        emptyIcon="FileSignature"
        emptyTitle="لا توجد عقود"
        emptyDescription="سجّل عقود المكتب لتتابع تواريخ انتهائها وتصلك التنبيهات قبلها."
        emptyAction={
          canCreate ? (
            <Button size="sm" onClick={() => { setEditing(null); setOpen(true) }}>
              <Plus className="size-4" />
              إضافة عقد
            </Button>
          ) : null
        }
      />

      <ContractDialog open={open} onOpenChange={setOpen} options={options} defaults={editing} />
    </>
  )
}
