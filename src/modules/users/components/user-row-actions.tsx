'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Pencil, Trash2, KeyRound } from 'lucide-react'
import { deleteUserAction } from '../actions'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

type Props = {
  id: string
  name: string
  isSelf: boolean
  canUpdate: boolean
  canDelete: boolean
}

export function UserRowActions({ id, name, isSelf, canUpdate, canDelete }: Props) {
  const router = useRouter()

  if (!canUpdate && !canDelete) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`إجراءات ${name}`}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {canUpdate ? (
          <>
            <DropdownMenuItem asChild>
              <Link href={`/users/${id}`}>
                <Pencil />
                تعديل البيانات
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/users/${id}#password`}>
                <KeyRound />
                إعادة تعيين كلمة المرور
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}

        {canDelete && !isSelf ? (
          <>
            <DropdownMenuSeparator />
            <ConfirmDialog
              title="حذف المستخدم"
              description={`سيتم حذف «${name}» ولن يتمكّن من الدخول للنظام. تبقى سجلاته وأعماله السابقة محفوظة.`}
              confirmLabel="حذف المستخدم"
              action={() => deleteUserAction(id)}
              onDone={() => router.refresh()}
              trigger={
                <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
                  <Trash2 />
                  حذف المستخدم
                </DropdownMenuItem>
              }
            />
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
