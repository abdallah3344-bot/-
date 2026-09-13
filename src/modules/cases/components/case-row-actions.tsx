'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Pencil, Trash2, Eye, Archive, RotateCcw } from 'lucide-react'
import { deleteCaseAction, reopenCaseAction } from '../actions'
import { CloseCaseDialog } from './close-case-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

type Props = {
  id: string
  title: string
  status: string
  canUpdate: boolean
  canDelete: boolean
  canClose: boolean
}

export function CaseRowActions({ id, title, status, canUpdate, canDelete, canClose }: Props) {
  const router = useRouter()
  const isClosed = status === 'closed' || status === 'archived'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`إجراءات ${title}`}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/cases/${id}`}>
            <Eye />
            فتح ملف القضية
          </Link>
        </DropdownMenuItem>

        {canUpdate && !isClosed ? (
          <DropdownMenuItem asChild>
            <Link href={`/cases/${id}/edit`}>
              <Pencil />
              تعديل البيانات
            </Link>
          </DropdownMenuItem>
        ) : null}

        {canClose && !isClosed ? (
          <>
            <DropdownMenuSeparator />
            <CloseCaseDialog
              caseId={id}
              title={title}
              onDone={() => router.refresh()}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Archive />
                  إغلاق وأرشفة
                </DropdownMenuItem>
              }
            />
          </>
        ) : null}

        {isClosed ? (
          <>
            <DropdownMenuSeparator />
            <ConfirmDialog
              title="إعادة فتح القضية"
              description={`ستُعاد «${title}» إلى القضايا النشطة بحالة «قيد المتابعة».`}
              confirmLabel="إعادة الفتح"
              action={() => reopenCaseAction(id)}
              onDone={() => router.refresh()}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <RotateCcw />
                  إعادة فتح القضية
                </DropdownMenuItem>
              }
            />
          </>
        ) : null}

        {canDelete ? (
          <>
            <DropdownMenuSeparator />
            <ConfirmDialog
              title="حذف القضية"
              description={`سيتم حذف «${title}» مع جلساتها ومستنداتها المرتبطة. لا يمكن التراجع بسهولة.`}
              confirmLabel="حذف القضية"
              action={() => deleteCaseAction(id)}
              onDone={() => router.refresh()}
              trigger={
                <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
                  <Trash2 />
                  حذف القضية
                </DropdownMenuItem>
              }
            />
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
