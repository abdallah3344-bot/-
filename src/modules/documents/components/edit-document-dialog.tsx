'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import { updateDocumentAction } from '../actions'
import type { DocumentRow } from '../queries'
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

const NONE = '__none__'
const initialState: ActionResult = { ok: true }

type Props = {
  document: DocumentRow
  categories: { id: string; name_ar: string }[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditDocumentDialog({ document, categories, open, onOpenChange }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(updateDocumentAction, initialState)

  useEffect(() => {
    if (state.ok && state.message) {
      toast.success(state.message)
      onOpenChange(false)
      router.refresh()
    }
  }, [state, onOpenChange, router])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تعديل بيانات المستند</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-4" noValidate>
          <input type="hidden" name="id" value={document.id} />
          <FormError message={!state.ok ? state.error : null} />

          <FormField name="name" label="اسم المستند" required>
            <Input id="name" name="name" defaultValue={document.name} />
          </FormField>

          <FormField name="categoryId" label="التصنيف">
            <Select name="categoryId" defaultValue={document.category_id ?? NONE}>
              <SelectTrigger id="categoryId"><SelectValue placeholder="غير مصنّف" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>غير مصنّف</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField name="description" label="الوصف">
            <Textarea id="description" name="description" rows={3}
                      defaultValue={document.description ?? ''} />
          </FormField>

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
