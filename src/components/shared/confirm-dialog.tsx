'use client'

import { useState, useTransition } from 'react'
import { Loader2, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type Props = {
  trigger: React.ReactNode
  title: string
  description: string
  confirmLabel?: string
  /** يُرجع نتيجة الإجراء؛ الرسالة تُعرض للمستخدم. */
  action: () => Promise<{ ok: boolean; error?: string; message?: string }>
  onDone?: () => void
}

export function ConfirmDialog({
  trigger, title, description, confirmLabel = 'تأكيد الحذف', action, onDone,
}: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function confirm() {
    startTransition(async () => {
      const result = await action()
      if (result.ok) {
        toast.success(result.message ?? 'تم تنفيذ العملية بنجاح')
        setOpen(false)
        onDone?.()
      } else {
        toast.error(result.error ?? 'تعذّر تنفيذ العملية')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <span onClick={() => setOpen(true)}>{trigger}</span>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-red-50 text-danger dark:bg-red-950/50">
            <TriangleAlert className="size-5" />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="danger" onClick={confirm} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
