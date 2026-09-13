'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Loader2, Check, X } from 'lucide-react'
import { saveLookupAction, toggleLookupAction } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export type LookupItem = {
  id: string
  name_ar: string
  is_active: boolean
  governorate?: string | null
}

type Props = {
  table: string
  title: string
  description: string
  items: LookupItem[]
  /** المحاكم لها حقل محافظة إضافي */
  withGovernorate?: boolean
  canEdit: boolean
}

export function LookupManager({
  table, title, description, items, withGovernorate, canEdit,
}: Props) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [governorate, setGovernorate] = useState('')
  const [pending, startTransition] = useTransition()

  function reset() {
    setAdding(false)
    setEditingId(null)
    setName('')
    setGovernorate('')
  }

  function save(id?: string) {
    startTransition(async () => {
      const result = await saveLookupAction(table, {
        id,
        name_ar: name,
        extra: withGovernorate ? { governorate: governorate || null } : undefined,
      })
      if (result.ok) {
        toast.success(result.message ?? 'تم')
        reset()
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  function toggle(id: string, next: boolean) {
    startTransition(async () => {
      const result = await toggleLookupAction(table, id, next)
      if (result.ok) router.refresh()
      else toast.error(result.error)
    })
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {canEdit && !adding ? (
          <Button size="sm" variant="outline" onClick={() => { reset(); setAdding(true) }}>
            <Plus className="size-4" />
            إضافة
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-2">
        {adding ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-muted p-2">
            <Input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="الاسم" className="h-9 min-w-40 flex-1"
              aria-label={`اسم ${title} الجديد`}
              onKeyDown={(e) => e.key === 'Enter' && name.trim() && save()}
            />
            {withGovernorate ? (
              <Input
                value={governorate} onChange={(e) => setGovernorate(e.target.value)}
                placeholder="المحافظة" className="h-9 w-36"
                aria-label="المحافظة"
              />
            ) : null}
            <Button size="sm" onClick={() => save()} disabled={pending || !name.trim()}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              حفظ
            </Button>
            <Button size="sm" variant="ghost" onClick={reset} disabled={pending}>
              <X className="size-4" />
            </Button>
          </div>
        ) : null}

        {items.length === 0 && !adding ? (
          <p className="py-4 text-center text-sm text-muted-foreground">لا توجد عناصر بعد.</p>
        ) : null}

        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-2">
              {editingId === item.id ? (
                <span className="flex flex-1 flex-wrap items-center gap-2">
                  <Input
                    value={name} onChange={(e) => setName(e.target.value)}
                    className="h-9 min-w-40 flex-1" aria-label="تعديل الاسم"
                    onKeyDown={(e) => e.key === 'Enter' && name.trim() && save(item.id)}
                  />
                  {withGovernorate ? (
                    <Input
                      value={governorate} onChange={(e) => setGovernorate(e.target.value)}
                      placeholder="المحافظة" className="h-9 w-36" aria-label="المحافظة"
                    />
                  ) : null}
                  <Button size="sm" onClick={() => save(item.id)} disabled={pending || !name.trim()}>
                    {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={reset} disabled={pending}>
                    <X className="size-4" />
                  </Button>
                </span>
              ) : (
                <>
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{item.name_ar}</span>
                    {item.governorate ? (
                      <span className="block text-xs text-muted-foreground">
                        {item.governorate}
                      </span>
                    ) : null}
                  </span>

                  <span className="flex shrink-0 items-center gap-2">
                    {!item.is_active ? <Badge variant="muted">مخفي</Badge> : null}

                    {canEdit ? (
                      <>
                        <Button
                          variant="ghost" size="icon"
                          aria-label={`تعديل ${item.name_ar}`}
                          onClick={() => {
                            setAdding(false)
                            setEditingId(item.id)
                            setName(item.name_ar)
                            setGovernorate(item.governorate ?? '')
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost" size="sm" disabled={pending}
                          onClick={() => toggle(item.id, !item.is_active)}
                        >
                          {item.is_active ? 'إخفاء' : 'تفعيل'}
                        </Button>
                      </>
                    ) : null}
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
