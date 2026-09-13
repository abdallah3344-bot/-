'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, MessageSquarePlus } from 'lucide-react'
import { addCaseNoteAction } from '../actions'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/empty-state'
import { timeAgo } from '@/lib/utils'

type Note = {
  id: string
  body: string
  created_at: string
  profiles: { full_name: string } | null
}

export function CaseNotesPanel({
  caseId, notes, canAdd,
}: {
  caseId: string
  notes: Note[]
  canAdd: boolean
}) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [pending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      const result = await addCaseNoteAction(caseId, body)
      if (result.ok) {
        toast.success(result.message ?? 'تمت الإضافة')
        setBody('')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="space-y-4">
      {canAdd ? (
        <Card>
          <CardContent className="space-y-3 pt-5">
            <Textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="أضف ملاحظة على سير القضية..."
              aria-label="نص الملاحظة"
            />
            <Button onClick={submit} disabled={pending || body.trim().length === 0} size="sm">
              {pending ? <Loader2 className="size-4 animate-spin" />
                       : <MessageSquarePlus className="size-4" />}
              إضافة ملاحظة
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {notes.length === 0 ? (
        <EmptyState icon="MessageSquarePlus" title="لا توجد ملاحظات"
                    description="سجّل ملاحظاتك على سير القضية ليراها فريق العمل." />
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id}>
              <Card>
                <CardContent className="pt-5">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{note.body}</p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {note.profiles?.full_name ?? 'مستخدم محذوف'} · {timeAgo(note.created_at)}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
