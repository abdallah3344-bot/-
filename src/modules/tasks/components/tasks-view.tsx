'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { TaskDialog, type TaskOptions } from './task-dialog'
import { toggleTaskDoneAction, deleteTaskAction } from '../actions'
import type { TaskRow } from '../queries'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { DataTable, type Column } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { formatDate, daysUntil, cn } from '@/lib/utils'
import {
  TASK_STATUS_LABELS, TASK_STATUS_TONE, PRIORITY_LABELS, PRIORITY_TONE, labelOf, toneOf,
} from '@/lib/constants/enums'

type Props = {
  rows: TaskRow[]
  options: TaskOptions
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  lockedCaseId?: string
}

function toDefaults(row: TaskRow): Record<string, string | null> {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    caseId: row.case_id,
    clientId: row.client_id,
    assigneeId: row.assignee_id,
    dueDate: row.due_date,
    priority: row.priority,
    status: row.status,
    notes: row.notes,
  }
}

export function TasksView({
  rows, options, canCreate, canUpdate, canDelete, lockedCaseId,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Record<string, string | null> | null>(null)
  const [, startTransition] = useTransition()

  function toggle(row: TaskRow, done: boolean) {
    startTransition(async () => {
      const result = await toggleTaskDoneAction(row.id, done)
      if (result.ok) {
        toast.success(result.message ?? 'تم')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  const columns: Column<TaskRow>[] = [
    {
      key: 'done',
      header: '',
      className: 'w-10',
      cell: (row) => (
        <Checkbox
          checked={row.status === 'completed'}
          disabled={!canUpdate}
          onCheckedChange={(v) => toggle(row, v === true)}
          aria-label={`تعليم «${row.title}» ${row.status === 'completed' ? 'غير منجزة' : 'منجزة'}`}
        />
      ),
    },
    {
      key: 'title',
      header: 'المهمة',
      cell: (row) => (
        <span className="block min-w-0">
          <span
            className={cn(
              'block truncate font-medium',
              row.status === 'completed' && 'text-muted-foreground line-through',
            )}
          >
            {row.title}
          </span>
          {row.cases ? (
            <Link href={`/cases/${row.cases.id}`}
                  className="block truncate text-xs text-muted-foreground hover:text-gold-600">
              {row.cases.title}
            </Link>
          ) : null}
        </span>
      ),
    },
    {
      key: 'assignee',
      header: 'المسؤول',
      hideBelow: 'md',
      cell: (row) => <span className="text-sm">{row.assignee?.full_name ?? '—'}</span>,
    },
    {
      key: 'due',
      header: 'الاستحقاق',
      hideBelow: 'sm',
      cell: (row) => {
        if (!row.due_date) return <span className="text-sm text-muted-foreground">—</span>
        const days = daysUntil(row.due_date)
        const overdue = days !== null && days < 0 && row.status !== 'completed'
        return (
          <span className={cn('block text-sm tabular', overdue && 'text-danger font-medium')}>
            {formatDate(row.due_date)}
            {overdue ? (
              <span className="block text-xs">متأخرة {Math.abs(days)} يوم</span>
            ) : days === 0 ? (
              <span className="block text-xs text-warning">اليوم</span>
            ) : null}
          </span>
        )
      },
    },
    {
      key: 'priority',
      header: 'الأولوية',
      hideBelow: 'lg',
      cell: (row) => (
        <Badge variant={toneOf(PRIORITY_TONE, row.priority)}>
          {labelOf(PRIORITY_LABELS, row.priority)}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      cell: (row) => (
        <Badge variant={toneOf(TASK_STATUS_TONE, row.status)}>
          {labelOf(TASK_STATUS_LABELS, row.status)}
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
                  onSelect={(e) => { e.preventDefault(); setEditing(toDefaults(row)); setOpen(true) }}
                >
                  <Pencil />
                  تعديل المهمة
                </DropdownMenuItem>
              ) : null}
              {canDelete ? (
                <>
                  <DropdownMenuSeparator />
                  <ConfirmDialog
                    title="حذف المهمة"
                    description={`سيتم حذف «${row.title}».`}
                    confirmLabel="حذف المهمة"
                    action={() => deleteTaskAction(row.id)}
                    onDone={() => router.refresh()}
                    trigger={
                      <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
                        <Trash2 />
                        حذف المهمة
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
            مهمة جديدة
          </Button>
        </div>
      ) : null}

      <DataTable
        rows={rows} columns={columns} rowKey={(row) => row.id}
        emptyIcon="ListChecks"
        emptyTitle="لا توجد مهام"
        emptyDescription="أضف مهمة وحدّد مسؤولها وتاريخ استحقاقها لتتابعها هنا وفي التقويم."
        emptyAction={
          canCreate ? (
            <Button size="sm" onClick={() => { setEditing(null); setOpen(true) }}>
              <Plus className="size-4" />
              مهمة جديدة
            </Button>
          ) : null
        }
      />

      <TaskDialog
        open={open} onOpenChange={setOpen}
        options={options} defaults={editing} lockedCaseId={lockedCaseId}
      />
    </>
  )
}
