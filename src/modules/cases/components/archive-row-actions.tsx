'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Eye, RotateCcw } from 'lucide-react'
import { reopenCaseAction } from '../actions'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

export function ArchiveRowActions({
  id, title, canReopen,
}: {
  id: string
  title: string
  canReopen: boolean
}) {
  const router = useRouter()

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
            عرض الملف
          </Link>
        </DropdownMenuItem>

        {canReopen ? (
          <>
            <DropdownMenuSeparator />
            <ConfirmDialog
              title="إعادة فتح القضية"
              description={`ستُعاد «${title}» إلى القضايا النشطة بحالة «قيد المتابعة» مع كل مستنداتها.`}
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
