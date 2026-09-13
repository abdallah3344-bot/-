'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import { createTaskAction, updateTaskAction } from '../actions'
import type { ActionResult } from '@/modules/auth/actions'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { FormField, FormError } from '@/components/shared/form-field'
import {
  TASK_STATUSES, TASK_STATUS_LABELS, PRIORITIES, PRIORITY_LABELS,
} from '@/lib/constants/enums'

const NONE = '__none__'
const initialState: ActionResult = { ok: true }

export type TaskOptions = {
  cases: { id: string; title: string; internal_no: string }[]
  clients: { id: string; name: string }[]
  staff: { id: string; full_name: string }[]
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  options: TaskOptions
  defaults?: Record<string, string | null> | null
  lockedCaseId?: string
}

export function TaskDialog({ open, onOpenChange, options, defaults, lockedCaseId }: Props) {
  const router = useRouter()
  const isEdit = Boolean(defaults?.id)
  const [state, formAction, pending] = useActionState(
    isEdit ? updateTaskAction : createTaskAction,
    initialState,
  )

  useEffect(() => {
    if (state.ok && state.message) {
      toast.success(state.message)
      onOpenChange(false)
      router.refresh()
    }
  }, [state, onOpenChange, router])

  const err = (name: string) => (!state.ok ? state.fieldErrors?.[name] : undefined)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'تعديل المهمة' : 'مهمة جديدة'}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-4" noValidate>
          {defaults?.id ? <input type="hidden" name="id" value={defaults.id} /> : null}
          <FormError message={!state.ok ? state.error : null} />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="title" label="المهمة" required error={err('title')}
                       className="sm:col-span-2">
              <Input id="title" name="title" defaultValue={defaults?.title ?? ''}
                     placeholder="مثال: إعداد مذكرة جوابية"
                     aria-invalid={Boolean(err('title'))} />
            </FormField>

            <FormField name="caseId" label="القضية" error={err('caseId')}>
              <Select name="caseId" defaultValue={defaults?.caseId ?? lockedCaseId ?? NONE}
                      disabled={Boolean(lockedCaseId)}>
                <SelectTrigger id="caseId"><SelectValue placeholder="غير مرتبطة بقضية" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>غير مرتبطة بقضية</SelectItem>
                  {options.cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title} — {c.internal_no}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="clientId" label="العميل" error={err('clientId')}>
              <Select name="clientId" defaultValue={defaults?.clientId ?? NONE}>
                <SelectTrigger id="clientId"><SelectValue placeholder="غير محدّد" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>غير محدّد</SelectItem>
                  {options.clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="assigneeId" label="المسؤول" error={err('assigneeId')}>
              <Select name="assigneeId" defaultValue={defaults?.assigneeId ?? NONE}>
                <SelectTrigger id="assigneeId"><SelectValue placeholder="غير محدّد" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>غير محدّد</SelectItem>
                  {options.staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="dueDate" label="تاريخ الاستحقاق" error={err('dueDate')}>
              <Input id="dueDate" name="dueDate" type="date" defaultValue={defaults?.dueDate ?? ''} />
            </FormField>

            <FormField name="priority" label="الأولوية" required error={err('priority')}>
              <Select name="priority" defaultValue={defaults?.priority ?? 'medium'}>
                <SelectTrigger id="priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="status" label="الحالة" required error={err('status')}>
              <Select name="status" defaultValue={defaults?.status ?? 'new'}>
                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{TASK_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="description" label="الوصف" error={err('description')}
                       className="sm:col-span-2">
              <Textarea id="description" name="description" rows={3}
                        defaultValue={defaults?.description ?? ''} />
            </FormField>

            <FormField name="notes" label="ملاحظات" error={err('notes')} className="sm:col-span-2">
              <Textarea id="notes" name="notes" rows={2} defaultValue={defaults?.notes ?? ''} />
            </FormField>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              حفظ
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}
                    disabled={pending}>
              إلغاء
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
