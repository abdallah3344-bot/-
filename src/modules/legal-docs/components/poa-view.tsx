'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { PoaDialog, type LegalDocOptions } from './poa-dialog'
import { deletePoaAction } from '../actions'
import type { PoaRow } from '../queries'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { DataTable, type Column } from '@/components/shared/data-table'
import { ExpiryBadge } from '@/components/shared/expiry-badge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { formatDate } from '@/lib/utils'
import {
  POA_TYPE_LABELS, POA_STATUS_LABELS, POA_STATUS_TONE, labelOf, toneOf,
} from '@/lib/constants/enums'

type Props = {
  rows: PoaRow[]
  options: LegalDocOptions
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

export function PoaView({ rows, options, canCreate, canUpdate, canDelete }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Record<string, string | null> | null>(null)

  const columns: Column<PoaRow>[] = [
    {
      key: 'no',
      header: 'رقم الوكالة',
      cell: (row) => (
        <span className="block">
          <span className="block font-medium tabular">{row.poa_no}</span>
          <span className="block text-xs text-muted-foreground">
            {labelOf(POA_TYPE_LABELS, row.poa_type)}
          </span>
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
      key: 'case',
      header: 'القضية',
      hideBelow: 'md',
      cell: (row) =>
        row.cases ? (
          <Link href={`/cases/${row.cases.id}`}
                className="block max-w-48 truncate text-sm hover:text-gold-600">
            {row.cases.title}
          </Link>
        ) : <span className="text-xs text-muted-foreground">—</span>,
    },
    {
      key: 'issued',
      header: 'تاريخ الوكالة',
      hideBelow: 'lg',
      cell: (row) => <span className="text-sm tabular">{formatDate(row.issued_at)}</span>,
    },
    {
      key: 'expires',
      header: 'تاريخ الانتهاء',
      cell: (row) => <ExpiryBadge date={row.expires_at} />,
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
        <Badge variant={toneOf(POA_STATUS_TONE, row.status)}>
          {labelOf(POA_STATUS_LABELS, row.status)}
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
              <Button variant="ghost" size="icon" aria-label={`إجراءات ${row.poa_no}`}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canUpdate ? (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    setEditing({
                      id: row.id, clientId: row.client_id, caseId: row.case_id,
                      poaType: row.poa_type, issuedAt: row.issued_at,
                      expiresAt: row.expires_at, lawyerId: row.lawyer_id,
                      status: row.status, documentId: row.document_id, notes: row.notes,
                    })
                    setOpen(true)
                  }}
                >
                  <Pencil />
                  تعديل الوكالة
                </DropdownMenuItem>
              ) : null}
              {canDelete ? (
                <>
                  <DropdownMenuSeparator />
                  <ConfirmDialog
                    title="حذف الوكالة"
                    description={`سيتم حذف الوكالة رقم ${row.poa_no}.`}
                    confirmLabel="حذف الوكالة"
                    action={() => deletePoaAction(row.id)}
                    onDone={() => router.refresh()}
                    trigger={
                      <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
                        <Trash2 />
                        حذف الوكالة
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
            إضافة وكالة
          </Button>
        </div>
      ) : null}

      <DataTable
        rows={rows} columns={columns} rowKey={(row) => row.id}
        emptyIcon="ScrollText"
        emptyTitle="لا توجد وكالات"
        emptyDescription="سجّل وكالات الموكّلين لتتابع تواريخ انتهائها وتصلك التنبيهات."
        emptyAction={
          canCreate ? (
            <Button size="sm" onClick={() => { setEditing(null); setOpen(true) }}>
              <Plus className="size-4" />
              إضافة وكالة
            </Button>
          ) : null
        }
      />

      <PoaDialog open={open} onOpenChange={setOpen} options={options} defaults={editing} />
    </>
  )
}
