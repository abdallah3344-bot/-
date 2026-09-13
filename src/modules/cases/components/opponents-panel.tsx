'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Plus, Pencil, Trash2, Save, UserRound } from 'lucide-react'
import { saveOpponentAction, deleteOpponentAction } from '../actions'
import type { ActionResult } from '@/modules/auth/actions'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormField, FormError } from '@/components/shared/form-field'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { DetailList } from '@/components/shared/detail-list'
import { Card, CardContent } from '@/components/ui/card'

export type Opponent = {
  id: string
  name: string
  national_id: string | null
  phone: string | null
  address: string | null
  lawyer_name: string | null
  lawyer_phone: string | null
  notes: string | null
}

type Props = {
  caseId: string
  opponents: Opponent[]
  canEdit: boolean
}

const initialState: ActionResult = { ok: true }

export function OpponentsPanel({ caseId, opponents, canEdit }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState<Opponent | null>(null)
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(saveOpponentAction, initialState)

  useEffect(() => {
    if (state.ok && state.message) {
      toast.success(state.message)
      setOpen(false)
      setEditing(null)
      router.refresh()
    }
  }, [state, router])

  const err = (name: string) => (!state.ok ? state.fieldErrors?.[name] : undefined)

  function openNew() {
    setEditing(null)
    setOpen(true)
  }

  function openEdit(opponent: Opponent) {
    setEditing(opponent)
    setOpen(true)
  }

  return (
    <div className="space-y-4">
      {canEdit ? (
        <Button onClick={openNew} size="sm">
          <Plus className="size-4" />
          إضافة خصم
        </Button>
      ) : null}

      {opponents.length === 0 ? (
        <EmptyState
          icon="Users"
          title="لا يوجد خصوم مسجّلون"
          description="أضف أطراف الخصومة في هذه القضية. يمكن إضافة أكثر من خصم."
        />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {opponents.map((opponent) => (
            <li key={opponent.id}>
              <Card>
                <CardContent className="pt-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <span className="flex items-center gap-2 font-medium">
                      <UserRound className="size-4 text-muted-foreground" />
                      {opponent.name}
                    </span>
                    {canEdit ? (
                      <span className="flex shrink-0 gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(opponent)}
                                aria-label={`تعديل ${opponent.name}`}>
                          <Pencil className="size-4" />
                        </Button>
                        <ConfirmDialog
                          title="حذف الخصم"
                          description={`سيتم حذف «${opponent.name}» من أطراف هذه القضية.`}
                          confirmLabel="حذف"
                          action={() => deleteOpponentAction(opponent.id, caseId)}
                          onDone={() => router.refresh()}
                          trigger={
                            <Button variant="ghost" size="icon" aria-label={`حذف ${opponent.name}`}>
                              <Trash2 className="size-4 text-danger" />
                            </Button>
                          }
                        />
                      </span>
                    ) : null}
                  </div>

                  <DetailList
                    columns={2}
                    items={[
                      { label: 'رقم الهوية', value: opponent.national_id, ltr: true },
                      { label: 'الهاتف', value: opponent.phone, ltr: true },
                      { label: 'العنوان', value: opponent.address, full: true },
                      { label: 'محامي الخصم', value: opponent.lawyer_name },
                      { label: 'هاتف المحامي', value: opponent.lawyer_phone, ltr: true },
                      ...(opponent.notes
                        ? [{ label: 'ملاحظات', value: opponent.notes, full: true }]
                        : []),
                    ]}
                  />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل بيانات الخصم' : 'إضافة خصم'}</DialogTitle>
          </DialogHeader>

          <form action={formAction} className="space-y-4" noValidate>
            <input type="hidden" name="caseId" value={caseId} />
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

            <FormError message={!state.ok ? state.error : null} />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField name="name" label="اسم الخصم" required error={err('name')}
                         className="sm:col-span-2">
                <Input id="name" name="name" defaultValue={editing?.name ?? ''}
                       aria-invalid={Boolean(err('name'))} />
              </FormField>

              <FormField name="nationalId" label="رقم الهوية" error={err('nationalId')}>
                <Input id="nationalId" name="nationalId" dir="ltr" className="text-start"
                       defaultValue={editing?.national_id ?? ''} />
              </FormField>

              <FormField name="phone" label="الهاتف" error={err('phone')}>
                <Input id="phone" name="phone" dir="ltr" className="text-start"
                       defaultValue={editing?.phone ?? ''} />
              </FormField>

              <FormField name="address" label="العنوان" error={err('address')}
                         className="sm:col-span-2">
                <Input id="address" name="address" defaultValue={editing?.address ?? ''} />
              </FormField>

              <FormField name="lawyerName" label="محامي الخصم" error={err('lawyerName')}>
                <Input id="lawyerName" name="lawyerName" defaultValue={editing?.lawyer_name ?? ''} />
              </FormField>

              <FormField name="lawyerPhone" label="هاتف المحامي" error={err('lawyerPhone')}>
                <Input id="lawyerPhone" name="lawyerPhone" dir="ltr" className="text-start"
                       defaultValue={editing?.lawyer_phone ?? ''} />
              </FormField>

              <FormField name="notes" label="ملاحظات" error={err('notes')} className="sm:col-span-2">
                <Textarea id="notes" name="notes" rows={2} defaultValue={editing?.notes ?? ''} />
              </FormField>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                حفظ
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
