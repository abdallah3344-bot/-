'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, MoreHorizontal, Pencil, Trash2, ArrowUpLeft, ArrowDownRight } from 'lucide-react'
import { CorrespondenceDialog, type CorrOptions } from './correspondence-dialog'
import { deleteCorrespondenceAction } from '../actions'
import type { CorrespondenceRow } from '../queries'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { DataTable, type Column } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { formatDate } from '@/lib/utils'
import {
  CORR_DIRECTION_LABELS, CORR_PARTY_LABELS, CORR_STATUS_LABELS, labelOf,
} from '@/lib/constants/enums'

type Props = {
  rows: CorrespondenceRow[]
  options: CorrOptions
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

export function CorrespondenceView({
  rows, options, canCreate, canUpdate, canDelete,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Record<string, string | null> | null>(null)

  const columns: Column<CorrespondenceRow>[] = [
    {
      key: 'reference',
      header: 'الرقم',
      cell: (row) => (
        <span className="block">
          <span className="flex items-center gap-1.5 font-medium tabular">
            {row.direction === 'outgoing'
              ? <ArrowUpLeft className="size-3.5 text-blue-600" />
              : <ArrowDownRight className="size-3.5 text-emerald-600" />}
            {row.reference_no}
          </span>
          <span className="block text-xs text-muted-foreground">{formatDate(row.corr_date)}</span>
        </span>
      ),
    },
    {
      key: 'subject',
      header: 'الموضوع',
      cell: (row) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium">{row.subject}</span>
          <span className="block truncate text-xs text-muted-foreground">{row.party_name}</span>
        </span>
      ),
    },
    {
      key: 'direction',
      header: 'النوع',
      cell: (row) => (
        <Badge variant={row.direction === 'outgoing' ? 'info' : 'success'}>
          {labelOf(CORR_DIRECTION_LABELS, row.direction)}
        </Badge>
      ),
    },
    {
      key: 'party',
      header: 'الجهة',
      hideBelow: 'md',
      cell: (row) => (
        <Badge variant="outline">{labelOf(CORR_PARTY_LABELS, row.party_type)}</Badge>
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
      key: 'owner',
      header: 'المسؤول',
      hideBelow: 'lg',
      cell: (row) => <span className="text-sm">{row.owner?.full_name ?? '—'}</span>,
    },
    {
      key: 'status',
      header: 'الحالة',
      cell: (row) => (
        <Badge variant={row.status === 'closed' ? 'muted' : row.status === 'open' ? 'warning' : 'info'}>
          {labelOf(CORR_STATUS_LABELS, row.status)}
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
              <Button variant="ghost" size="icon" aria-label={`إجراءات ${row.reference_no}`}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canUpdate ? (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    setEditing({
                      id: row.id, direction: row.direction, partyType: row.party_type,
                      partyName: row.party_name, subject: row.subject, body: row.body,
                      corrDate: row.corr_date, clientId: row.client_id, caseId: row.case_id,
                      ownerId: row.owner_id, documentId: row.document_id, status: row.status,
                    })
                    setOpen(true)
                  }}
                >
                  <Pencil />
                  تعديل المراسلة
                </DropdownMenuItem>
              ) : null}
              {canDelete ? (
                <>
                  <DropdownMenuSeparator />
                  <ConfirmDialog
                    title="حذف المراسلة"
                    description={`سيتم حذف المراسلة ${row.reference_no}.`}
                    confirmLabel="حذف المراسلة"
                    action={() => deleteCorrespondenceAction(row.id)}
                    onDone={() => router.refresh()}
                    trigger={
                      <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
                        <Trash2 />
                        حذف المراسلة
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
            تسجيل مراسلة
          </Button>
        </div>
      ) : null}

      <DataTable
        rows={rows} columns={columns} rowKey={(row) => row.id}
        emptyIcon="Mails"
        emptyTitle="لا توجد مراسلات"
        emptyDescription="سجّل الصادر والوارد مع المحاكم والعملاء والجهات الرسمية برقم مرجعي تلقائي."
        emptyAction={
          canCreate ? (
            <Button size="sm" onClick={() => { setEditing(null); setOpen(true) }}>
              <Plus className="size-4" />
              تسجيل مراسلة
            </Button>
          ) : null
        }
      />

      <CorrespondenceDialog
        open={open} onOpenChange={setOpen} options={options} defaults={editing}
      />
    </>
  )
}
