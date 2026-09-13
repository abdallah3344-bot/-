'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Archive } from 'lucide-react'
import { closeCaseAction } from '../actions'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

type Props = {
  caseId: string
  title: string
  trigger: React.ReactNode
  onDone?: () => void
}

export function CloseCaseDialog({ caseId, title, trigger, onDone }: Props) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit() {
    setError(null)
    startTransition(async () => {
      const result = await closeCaseAction(caseId, reason)
      if (result.ok) {
        toast.success(result.message ?? 'تم إغلاق القضية')
        setOpen(false)
        setReason('')
        onDone?.()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <span onClick={() => setOpen(true)}>{trigger}</span>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>إغلاق القضية وأرشفتها</DialogTitle>
          <DialogDescription>
            ستُنقل «{title}» إلى الأرشيف مع الاحتفاظ بكل مستنداتها وحركاتها المالية
            وتاريخ الإغلاق. يمكن إعادة فتحها لاحقًا بصلاحية مخصّصة.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="close-reason">سبب الإغلاق *</Label>
          <Textarea
            id="close-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="مثال: صدر حكم نهائي لصالح الموكّل وتم التنفيذ."
          />
          {error ? <p className="text-xs text-danger">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={pending || reason.trim().length < 3}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Archive className="size-4" />}
            إغلاق وأرشفة
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
