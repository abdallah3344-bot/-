'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, MoreHorizontal, Pencil, Trash2, ClipboardCheck, Eye } from 'lucide-react'
import { HearingDialog, type HearingOptions } from './hearing-dialog'
import { RecordResultDialog } from './record-result-dialog'
import { deleteHearingAction } from '../actions'
import type { HearingRow } from '../queries'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { DataTable, type Column } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { formatDate, formatTime } from '@/lib/utils'
import {
  HEARING_STATUS_LABELS, HEARING_STATUS_TONE, HEARING_TYPE_LABELS, labelOf, toneOf,
} from '@/lib/constants/enums'

type Props = {
  rows: HearingRow[]
  options: HearingOptions
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  lockedCaseId?: string
}

/** يحوّل صف الجلسة إلى قيم النموذج. */
function toDefaults(row: Record<string, unknown>): Record<string, string | null> {
  const text = (key: string) => {
    const value = row[key]
    return value === null || value === undefined ? null : String(value)
  }
  return {
    id: text('id'),
    caseId: text('case_id'),
    courtId: text('court_id'),
    chamberId: text('chamber_id'),
    judgeId: text('judge_id'),
    hearingDate: text('hearing_date'),
    hearingTime: text('hearing_time'),
    room: text('room'),
    assignedLawyerId: text('assigned_lawyer_id'),
    hearingType: text('hearing_type'),
    requiredAction: text('required_action'),
    result: text('result'),
    decision: text('decision'),
    notes: text('notes'),
    nextHearingDate: text('next_hearing_date'),
    status: text('status'),
  }
}

export function HearingsView({
  rows, options, canCreate, canUpdate, canDelete, lockedCaseId,
}: Props) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Record<string, string | null> | null>(null)
  const [resultFor, setResultFor] = useState<HearingRow | null>(null)

  function openNew() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(row: HearingRow) {
    setEditing(toDefaults(row as unknown as Record<string, unknown>))
    setDialogOpen(true)
  }

  const today = new Date().toISOString().slice(0, 10)

  const columns: Column<HearingRow>[] = [
    {
      key: 'date',
      header: 'التاريخ والوقت',
      cell: (row) => (
        <span className="block">
          <span className="block font-medium tabular">{formatDate(row.hearing_date)}</span>
          <span className="block text-xs text-muted-foreground tabular">
            {row.hearing_time ? formatTime(row.hearing_time) : 'بلا وقت محدّد'}
            {row.hearing_date === today ? ' · اليوم' : ''}
          </span>
        </span>
      ),
    },
    {
      key: 'case',
      header: 'القضية',
      cell: (row) =>
        row.cases ? (
          <Link href={`/cases/${row.cases.id}`} className="block min-w-0 hover:text-gold-600">
            <span className="block truncate text-sm font-medium">{row.cases.title}</span>
            <span className="block text-xs text-muted-foreground tabular">
              {row.cases.internal_no}
            </span>
          </Link>
        ) : (
          '—'
        ),
    },
    {
      key: 'court',
      header: 'المحكمة',
      hideBelow: 'md',
      cell: (row) => (
        <span className="text-sm">
          {row.courts?.name_ar ?? '—'}
          {row.room ? <span className="block text-xs text-muted-foreground">قاعة {row.room}</span> : null}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'النوع',
      hideBelow: 'lg',
      cell: (row) => (
        <span className="text-sm">{labelOf(HEARING_TYPE_LABELS, row.hearing_type)}</span>
      ),
    },
    {
      key: 'lawyer',
      header: 'المحامي المكلّف',
      hideBelow: 'lg',
      cell: (row) => <span className="text-sm">{row.assigned?.full_name ?? '—'}</span>,
    },
    {
      key: 'status',
      header: 'الحالة',
      cell: (row) => (
        <Badge variant={toneOf(HEARING_STATUS_TONE, row.status)}>
          {labelOf(HEARING_STATUS_LABELS, row.status)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"
                    aria-label={`إجراءات جلسة ${formatDate(row.hearing_date)}`}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            {row.cases ? (
              <DropdownMenuItem asChild>
                <Link href={`/cases/${row.cases.id}`}>
                  <Eye />
                  فتح ملف القضية
                </Link>
              </DropdownMenuItem>
            ) : null}

            {canUpdate ? (
              <>
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setResultFor(row) }}>
                  <ClipboardCheck />
                  تسجيل نتيجة الجلسة
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); openEdit(row) }}>
                  <Pencil />
                  تعديل الجلسة
                </DropdownMenuItem>
              </>
            ) : null}

            {canDelete ? (
              <>
                <DropdownMenuSeparator />
                <ConfirmDialog
                  title="حذف الجلسة"
                  description={`سيتم حذف جلسة ${formatDate(row.hearing_date)}.`}
                  confirmLabel="حذف الجلسة"
                  action={() => deleteHearingAction(row.id)}
                  onDone={() => router.refresh()}
                  trigger={
                    <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
                      <Trash2 />
                      حذف الجلسة
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
          <Button onClick={openNew}>
            <Plus className="size-4" />
            إضافة جلسة
          </Button>
        </div>
      ) : null}

      <DataTable
        rows={rows} columns={columns}
        rowKey={(row) => row.id}
        emptyIcon="Gavel"
        emptyTitle="لا توجد جلسات في هذا النطاق"
        emptyDescription="جرّب تغيير النطاق أو التصفية، أو أضف جلسة جديدة."
        emptyAction={
          canCreate ? (
            <Button size="sm" onClick={openNew}>
              <Plus className="size-4" />
              إضافة جلسة
            </Button>
          ) : null
        }
      />

      <HearingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        options={options}
        defaults={editing}
        lockedCaseId={lockedCaseId}
      />

      {resultFor ? (
        <RecordResultDialog
          hearing={resultFor}
          open={Boolean(resultFor)}
          onOpenChange={(open) => !open && setResultFor(null)}
        />
      ) : null}
    </>
  )
}
