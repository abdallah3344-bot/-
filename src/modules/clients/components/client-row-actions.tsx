'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Pencil, Trash2, Eye } from 'lucide-react'
import { deleteClientAction } from '../actions'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

type Props = { id: string; name: string; canUpdate: boolean; canDelete: boolean }

export function ClientRowActions({ id, name, canUpdate, canDelete }: Props) {
  const router = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`إجراءات ${name}`}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/clients/${id}`}>
            <Eye />
            عرض الملف
          </Link>
        </DropdownMenuItem>

        {canUpdate ? (
          <DropdownMenuItem asChild>
            <Link href={`/clients/${id}/edit`}>
              <Pencil />
              تعديل البيانات
            </Link>
          </DropdownMenuItem>
        ) : null}

        {canDelete ? (
          <>
            <DropdownMenuSeparator />
            <ConfirmDialog
              title="حذف العميل"
              description={`سيتم حذف «${name}». لا يمكن حذف عميل مرتبط بقضايا قائمة.`}
              confirmLabel="حذف العميل"
              action={() => deleteClientAction(id)}
              onDone={() => router.refresh()}
              trigger={
                <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
                  <Trash2 />
                  حذف العميل
                </DropdownMenuItem>
              }
            />
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
