'use client'

import { useActionState, useRef, useState } from 'react'
import { useActionResult } from '@/lib/use-action-result'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Upload, FileText } from 'lucide-react'
import { uploadDocumentAction } from '../actions'
import type { ActionResult } from '@/modules/auth/actions'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { FormField, FormError } from '@/components/shared/form-field'
import { formatFileSize } from '@/lib/utils'

const NONE = '__none__'
const initialState: ActionResult = { ok: true }

const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp'

export type UploadOptions = {
  categories: { id: string; name_ar: string }[]
  cases: { id: string; title: string; internal_no: string }[]
  clients: { id: string; name: string }[]
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  options: UploadOptions
  lockedCaseId?: string
  lockedClientId?: string
}

export function UploadDialog({
  open, onOpenChange, options, lockedCaseId, lockedClientId,
}: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(uploadDocumentAction, initialState)
  const [file, setFile] = useState<File | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useActionResult(state, {
    onSuccess: (message) => {
      toast.success(message)
      onOpenChange(false)
      setFile(null)
      router.refresh()
    },
  })

  const err = (name: string) => (!state.ok ? state.fieldErrors?.[name] : undefined)

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null
    setFile(picked)
    // اسم المستند يتبع اسم الملف افتراضيًا ما لم يكتب المستخدم اسمًا
    if (picked && nameRef.current && !nameRef.current.value) {
      nameRef.current.value = picked.name.replace(/\.[^.]+$/, '')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>رفع مستند</DialogTitle>
          <DialogDescription>
            الصيغ المدعومة: PDF و Word و Excel وصور JPG/PNG/WEBP — حتى 50 ميجابايت.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4" noValidate>
          <FormError message={!state.ok && !state.fieldErrors ? state.error : null} />

          <FormField name="file" label="الملف" required error={err('file')}>
            <Input
              id="file" name="file" type="file" accept={ACCEPT}
              onChange={onFileChange}
              aria-invalid={Boolean(err('file'))}
              className="file:me-3 file:rounded file:border-0 file:bg-surface-muted file:px-3 file:py-1 file:text-sm"
            />
          </FormField>

          {file ? (
            <p className="flex items-center gap-2 rounded-lg bg-surface-muted p-2.5 text-xs">
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="shrink-0 text-muted-foreground tabular">
                {formatFileSize(file.size)}
              </span>
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="name" label="اسم المستند" required error={err('name')}
                       className="sm:col-span-2">
              <Input ref={nameRef} id="name" name="name"
                     placeholder="مثال: صورة الوكالة العامة" />
            </FormField>

            <FormField name="categoryId" label="التصنيف" error={err('categoryId')}>
              <Select name="categoryId" defaultValue={NONE}>
                <SelectTrigger id="categoryId"><SelectValue placeholder="غير مصنّف" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>غير مصنّف</SelectItem>
                  {options.categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="docDate" label="تاريخ المستند" error={err('docDate')}>
              <Input id="docDate" name="docDate" type="date" />
            </FormField>

            <FormField name="caseId" label="القضية" error={err('caseId')}>
              <Select name="caseId" defaultValue={lockedCaseId ?? NONE}
                      disabled={Boolean(lockedCaseId)}>
                <SelectTrigger id="caseId"><SelectValue placeholder="غير مرتبط بقضية" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>غير مرتبط بقضية</SelectItem>
                  {options.cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title} — {c.internal_no}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="clientId" label="العميل" error={err('clientId')}>
              <Select name="clientId" defaultValue={lockedClientId ?? NONE}
                      disabled={Boolean(lockedClientId)}>
                <SelectTrigger id="clientId"><SelectValue placeholder="غير محدّد" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>غير محدّد</SelectItem>
                  {options.clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField name="description" label="الوصف" error={err('description')}
                       className="sm:col-span-2">
              <Textarea id="description" name="description" rows={2} />
            </FormField>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending || !file}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {pending ? 'جارٍ الرفع...' : 'رفع المستند'}
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
