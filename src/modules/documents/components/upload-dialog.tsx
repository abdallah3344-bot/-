'use client'

import { startTransition, useActionState, useRef, useState } from 'react'
import { useActionResult } from '@/lib/use-action-result'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Upload, FileText } from 'lucide-react'
import { uploadDocumentAction, prepareDocumentUploadAction } from '../actions'
import { createClient } from '@/lib/supabase/client'
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
  const [sending, setSending] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const busy = pending || sending

  // الملف يُرفع من المتصفح إلى التخزين مباشرة، ثم تُسجَّل بياناته على الخادم
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file || busy) return
    const fd = new FormData(event.currentTarget)
    fd.delete('file')
    const pick = (k: string) => {
      const v = String(fd.get(k) ?? '')
      return v && v !== NONE ? v : undefined
    }
    setSending(true)
    try {
      const prep = await prepareDocumentUploadAction({
        mime: file.type, size: file.size, caseId: pick('caseId'), clientId: pick('clientId'),
      })
      if (!prep.ok) { toast.error(prep.error); return }
      const { error } = await createClient().storage.from('documents')
        .uploadToSignedUrl(prep.path, prep.token, file, { contentType: file.type })
      if (error) { toast.error(`تعذّر رفع الملف: ${error.message}`); return }
      fd.set('storagePath', prep.path)
      fd.set('fileName', file.name.replace(/\.[^.]+$/, ''))
      startTransition(() => formAction(fd))
    } catch {
      toast.error('انقطع الاتصال أثناء الرفع. أعد المحاولة.')
    } finally {
      setSending(false)
    }
  }

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

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
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
              {lockedCaseId ? <input type="hidden" name="caseId" value={lockedCaseId} /> : null}
              <Select name={lockedCaseId ? undefined : 'caseId'} defaultValue={lockedCaseId ?? NONE}
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
              {lockedClientId ? <input type="hidden" name="clientId" value={lockedClientId} /> : null}
              <Select name={lockedClientId ? undefined : 'clientId'} defaultValue={lockedClientId ?? NONE}
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
            <Button type="submit" disabled={busy || !file}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {busy ? 'جارٍ الرفع...' : 'رفع المستند'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}
                    disabled={busy}>
              إلغاء
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
