'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, ClipboardCheck } from 'lucide-react'
import { recordHearingResultAction } from '../actions'
import type { HearingRow } from '../queries'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { HEARING_STATUSES, HEARING_STATUS_LABELS } from '@/lib/constants/enums'
import { formatDate } from '@/lib/utils'

type Props = {
  hearing: HearingRow
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * تسجيل ما جرى في الجلسة. عند اختيار «مؤجلة» مع موعد قادم،
 * تُنشأ الجلسة التالية تلقائيًا بنفس بيانات المحكمة والقاعة والمحامي.
 */
export function RecordResultDialog({ hearing, open, onOpenChange }: Props) {
  const router = useRouter()
  const [result, setResult] = useState(hearing.result ?? '')
  const [decision, setDecision] = useState(hearing.decision ?? '')
  const [status, setStatus] = useState(hearing.status === 'scheduled' ? 'held' : hearing.status)
  const [nextDate, setNextDate] = useState(hearing.next_hearing_date ?? '')
  const [pending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      const res = await recordHearingResultAction(hearing.id, {
        result, decision, nextHearingDate: nextDate, status,
      })
      if (res.ok) {
        toast.success(res.message ?? 'تم التسجيل')
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>تسجيل نتيجة الجلسة</DialogTitle>
          <DialogDescription>
            {hearing.cases?.title} · {formatDate(hearing.hearing_date)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rr-status">حالة الجلسة</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="rr-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {HEARING_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{HEARING_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rr-result">ما جرى في الجلسة</Label>
            <Textarea id="rr-result" rows={3} value={result}
                      onChange={(e) => setResult(e.target.value)}
                      placeholder="مثال: حضر وكيل المدّعى عليه وطلب أجلًا للرد." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rr-decision">القرار</Label>
            <Textarea id="rr-decision" rows={2} value={decision}
                      onChange={(e) => setDecision(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rr-next">موعد الجلسة القادمة</Label>
            <Input id="rr-next" type="date" value={nextDate}
                   onChange={(e) => setNextDate(e.target.value)} />
            {status === 'postponed' && nextDate ? (
              <p className="text-xs text-muted-foreground">
                ستُنشأ الجلسة القادمة تلقائيًا بنفس المحكمة والقاعة والمحامي المكلّف.
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" />
                     : <ClipboardCheck className="size-4" />}
            حفظ النتيجة
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
