'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Upload, MoreHorizontal, Eye, Download, Pencil, Trash2, FileText,
  FileSpreadsheet, FileImage, Loader2,
} from 'lucide-react'
import { UploadDialog, type UploadOptions } from './upload-dialog'
import { EditDocumentDialog } from './edit-document-dialog'
import { getDocumentUrlAction, deleteDocumentAction } from '../actions'
import type { DocumentRow } from '../queries'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { DataTable, type Column } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { formatDate, formatFileSize } from '@/lib/utils'

type Props = {
  rows: DocumentRow[]
  options: UploadOptions
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  canDownload: boolean
  lockedCaseId?: string
  lockedClientId?: string
}

function FileIcon({ mime }: { mime: string | null }) {
  if (!mime) return <FileText className="size-4 text-muted-foreground" />
  if (mime.startsWith('image/')) return <FileImage className="size-4 text-emerald-600" />
  if (mime.includes('sheet') || mime.includes('excel'))
    return <FileSpreadsheet className="size-4 text-green-700" />
  if (mime === 'application/pdf') return <FileText className="size-4 text-red-600" />
  return <FileText className="size-4 text-blue-600" />
}

export function DocumentsView({
  rows, options, canCreate, canUpdate, canDelete, canDownload,
  lockedCaseId, lockedClientId,
}: Props) {
  const router = useRouter()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editing, setEditing] = useState<DocumentRow | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  /** يفتح الملف عبر رابط موقّع مؤقت — لا يوجد وصول مباشر للحاوية. */
  function openFile(row: DocumentRow, mode: 'view' | 'download') {
    setBusyId(row.id)
    startTransition(async () => {
      const result = await getDocumentUrlAction(row.id, mode)
      setBusyId(null)
      if (result.ok) window.open(result.url, '_blank', 'noopener,noreferrer')
      else toast.error(result.error)
    })
  }

  const columns: Column<DocumentRow>[] = [
    {
      key: 'name',
      header: 'المستند',
      cell: (row) => (
        <span className="flex items-start gap-2.5">
          <span className="mt-0.5 shrink-0"><FileIcon mime={row.mime_type} /></span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{row.name}</span>
            <span className="block text-xs text-muted-foreground tabular">
              {formatFileSize(row.size_bytes)}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: 'category',
      header: 'التصنيف',
      cell: (row) =>
        row.document_categories ? (
          <Badge variant="outline">{row.document_categories.name_ar}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">غير مصنّف</span>
        ),
    },
    {
      key: 'linked',
      header: 'مرتبط بـ',
      hideBelow: 'md',
      cell: (row) => (
        <span className="block min-w-0 text-sm">
          {row.cases ? (
            <Link href={`/cases/${row.cases.id}`} className="block truncate hover:text-gold-600">
              {row.cases.title}
            </Link>
          ) : null}
          {row.clients ? (
            <Link href={`/clients/${row.clients.id}`}
                  className="block truncate text-xs text-muted-foreground hover:text-gold-600">
              {row.clients.name}
            </Link>
          ) : null}
          {!row.cases && !row.clients ? '—' : null}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'التاريخ',
      hideBelow: 'lg',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.doc_date ?? row.created_at)}
        </span>
      ),
    },
    {
      key: 'uploader',
      header: 'رفعه',
      hideBelow: 'lg',
      cell: (row) => <span className="text-sm">{row.uploader?.full_name ?? '—'}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`إجراءات ${row.name}`}
                    disabled={busyId === row.id}>
              {busyId === row.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MoreHorizontal className="size-4" />
              )}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); openFile(row, 'view') }}>
              <Eye />
              معاينة
            </DropdownMenuItem>

            {canDownload ? (
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); openFile(row, 'download') }}>
                <Download />
                تحميل
              </DropdownMenuItem>
            ) : null}

            {canUpdate ? (
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setEditing(row) }}>
                <Pencil />
                إعادة تسمية وتصنيف
              </DropdownMenuItem>
            ) : null}

            {canDelete ? (
              <>
                <DropdownMenuSeparator />
                <ConfirmDialog
                  title="حذف المستند"
                  description={`سيتم حذف «${row.name}» نهائيًا من التخزين. لا يمكن التراجع.`}
                  confirmLabel="حذف المستند"
                  action={() => deleteDocumentAction(row.id)}
                  onDone={() => router.refresh()}
                  trigger={
                    <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
                      <Trash2 />
                      حذف المستند
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
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="size-4" />
            رفع مستند
          </Button>
        </div>
      ) : null}

      <DataTable
        rows={rows} columns={columns} rowKey={(row) => row.id}
        emptyIcon="FolderOpen"
        emptyTitle="لا توجد مستندات"
        emptyDescription="ارفع مستندات القضية أو العميل. الملفات محفوظة في تخزين خاص لا يُفتح إلا برابط موقّت."
        emptyAction={
          canCreate ? (
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <Upload className="size-4" />
              رفع مستند
            </Button>
          ) : null
        }
      />

      <UploadDialog
        open={uploadOpen} onOpenChange={setUploadOpen} options={options}
        lockedCaseId={lockedCaseId} lockedClientId={lockedClientId}
      />

      {editing ? (
        <EditDocumentDialog
          document={editing}
          categories={options.categories}
          open={Boolean(editing)}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      ) : null}
    </>
  )
}
