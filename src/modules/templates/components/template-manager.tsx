'use client'

import { useActionState, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Plus, Save, Loader2, Pencil, Trash2, Eye, EyeOff, FileText, FileType2, Copy,
} from 'lucide-react'
import {
  saveTemplateAction, deleteTemplateAction, toggleTemplateAction,
} from '../actions'
import { MERGE_FIELDS, MERGE_FIELD_GROUPS } from '../fields'
import type { TemplateRow } from '../queries'
import type { ActionResult } from '@/modules/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { FormField } from '@/components/shared/form-field'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { useActionResult } from '@/lib/use-action-result'

const initialState: ActionResult = { ok: true }

const SCOPE_LABELS: Record<string, string> = {
  case: 'قضية', client: 'موكل', general: 'عام',
}

type Props = {
  templates: TemplateRow[]
  categories: { id: string; name_ar: string }[]
  canManage: boolean
}

export function TemplateManager({ templates, categories, canManage }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState<TemplateRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [pending, startTransition] = useTransition()

  const [state, formAction, saving] = useActionState(saveTemplateAction, initialState)

  useActionResult(state, {
    onSuccess: (message) => {
      toast.success(message)
      setEditing(null)
      setCreating(false)
      router.refresh()
    },
    onError: (error) => toast.error(error),
  })

  const showForm = creating || editing !== null
  const fieldError = (name: string) => (!state.ok ? state.fieldErrors?.[name] : undefined)

  function remove(row: TemplateRow) {
    if (!confirm(`حذف القالب «${row.name}»؟`)) return
    startTransition(async () => {
      const result = await deleteTemplateAction(row.id)
      if (result.ok) { toast.success(result.message ?? 'تم الحذف.'); router.refresh() }
      else toast.error(result.error)
    })
  }

  function toggle(row: TemplateRow) {
    startTransition(async () => {
      const result = await toggleTemplateAction(row.id, !row.is_active)
      if (result.ok) { toast.success(result.message ?? 'تم التحديث.'); router.refresh() }
      else toast.error(result.error)
    })
  }

  return (
    <div className="space-y-6">
      {canManage ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => { setEditing(null); setCreating(true) }} disabled={showForm}>
            <Plus className="size-4" /> قالب جديد
          </Button>
        </div>
      ) : null}

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? `تعديل: ${editing.name}` : 'قالب جديد'}</CardTitle>
            <CardDescription>
              القالب مستندك أنت. النظام يملأ حقول الدمج من بيانات القضية ولا يكتب نصًّا قانونيًا.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form action={formAction} className="space-y-5" noValidate>
              {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField name="name" label="اسم القالب" required error={fieldError('name')}>
                  <Input id="name" name="name" defaultValue={editing?.name ?? ''} />
                </FormField>

                <FormField name="scope" label="نطاق القالب" required error={fieldError('scope')}
                           hint="يحدّد أي بيانات تتوفّر لحقول الدمج">
                  <Select name="scope" defaultValue={editing?.scope ?? 'case'}>
                    <SelectTrigger id="scope"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="case">قضية — بيانات القضية والموكل والخصوم</SelectItem>
                      <SelectItem value="client">موكل — بيانات الموكل فقط</SelectItem>
                      <SelectItem value="general">عام — بيانات المكتب فقط</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField name="categoryId" label="تصنيف المستند الناتج" error={fieldError('categoryId')}>
                  <Select name="categoryId" defaultValue={editing?.category_id ?? '__none__'}>
                    <SelectTrigger id="categoryId"><SelectValue placeholder="بلا تصنيف" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">بلا تصنيف</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField name="file" label="ملف Word (اختياري)" error={fieldError('file')}
                           hint="ارفع قالبك المعتمد بصيغة .docx وضع فيه حقول الدمج">
                  <Input id="file" name="file" type="file" accept=".docx" />
                </FormField>
              </div>

              <FormField name="description" label="وصف مختصر" error={fieldError('description')}>
                <Input id="description" name="description" defaultValue={editing?.description ?? ''} />
              </FormField>

              <FormField name="body" label="نص القالب" error={fieldError('body')}
                         hint="اتركه فارغًا إن كنت ترفع ملف Word فقط">
                <Textarea id="body" name="body" rows={12} dir="rtl"
                          defaultValue={editing?.body ?? ''}
                          placeholder={'محكمة {{case.court}} الموقّرة\n\nالمدعي: {{client.name}} — هوية رقم {{client.national_id}}\nالمدعى عليه: {{opponent.name}}\n\nالموضوع: {{case.title}}'} />
              </FormField>

              <div className="flex items-center gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  حفظ القالب
                </Button>
                <Button type="button" variant="ghost"
                        onClick={() => { setEditing(null); setCreating(false) }}>
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>القوالب</CardTitle>
            <CardDescription>{templates.length} قالب</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {templates.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                لا توجد قوالب بعد. أضف قالبك الأول أو ارفع ملف Word تستعمله في مكتبك.
              </p>
            ) : templates.map((row) => (
              <div key={row.id} data-template-row
                   className="flex flex-wrap items-center gap-3 rounded-[var(--radius-app)] border border-border p-3">
                {row.file_path ? <FileType2 className="size-4 text-muted-foreground" />
                               : <FileText className="size-4 text-muted-foreground" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{row.name}</p>
                  {row.description ? (
                    <p className="truncate text-xs text-muted-foreground">{row.description}</p>
                  ) : null}
                </div>
                <Badge variant="muted">{SCOPE_LABELS[row.scope] ?? row.scope}</Badge>
                {row.file_path ? <Badge variant="info">Word</Badge> : null}
                {!row.is_active ? <Badge variant="warning">مخفي</Badge> : null}

                {canManage ? (
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => { setCreating(false); setEditing(row) }}
                            aria-label={`تعديل ${row.name}`}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggle(row)} disabled={pending}
                            aria-label={`${row.is_active ? 'إخفاء' : 'إظهار'} ${row.name}`}>
                      {row.is_active ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(row)} disabled={pending}
                            aria-label={`حذف ${row.name}`}>
                      <Trash2 className="size-4 text-red-600" />
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">حقول الدمج</CardTitle>
            <CardDescription>اضغط الحقل لنسخه، وألصقه في القالب</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {MERGE_FIELD_GROUPS.map((group) => (
              <div key={group}>
                <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">{group}</p>
                <div className="flex flex-wrap gap-1.5">
                  {MERGE_FIELDS.filter((f) => f.group === group).map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => {
                        void navigator.clipboard?.writeText(`{{${f.key}}}`)
                        toast.success(`نُسخ {{${f.key}}}`)
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-muted px-2 py-1 text-xs hover:bg-accent"
                      title={`{{${f.key}}}`}
                    >
                      <Copy className="size-3 opacity-50" />
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
