'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Eye, Pencil, Trash2, Printer } from 'lucide-react'
import { deleteInvoiceAction } from '../actions'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

export function InvoiceRowActions({
  id, invoiceNo, canUpdate, canDelete,
}: {
  id: string
  invoiceNo: string
  canUpdate: boolean
  canDelete: boolean
}) {
  const router = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`إجراءات ${invoiceNo}`}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/invoices/${id}`}>
            <Eye />
            عرض الفاتورة
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href={`/invoices/${id}?print=1`}>
            <Printer />
            طباعة
          </Link>
        </DropdownMenuItem>

        {canUpdate ? (
          <DropdownMenuItem asChild>
            <Link href={`/invoices/${id}/edit`}>
              <Pencil />
              تعديل
            </Link>
          </DropdownMenuItem>
        ) : null}

        {canDelete ? (
          <>
            <DropdownMenuSeparator />
            <ConfirmDialog
              title="حذف الفاتورة"
              description={`سيتم حذف الفاتورة ${invoiceNo}. لا يمكن حذف فاتورة عليها دفعات مسجّلة.`}
              confirmLabel="حذف الفاتورة"
              action={() => deleteInvoiceAction(id)}
              onDone={() => router.refresh()}
              trigger={
                <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
                  <Trash2 />
                  حذف الفاتورة
                </DropdownMenuItem>
              }
            />
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
