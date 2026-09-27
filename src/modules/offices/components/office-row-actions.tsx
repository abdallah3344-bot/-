'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Link2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { setOfficeActiveAction, setOfficeSlugAction } from '../actions'

export function OfficeActiveSwitch({ officeId, active, locked }: { officeId: string; active: boolean; locked: boolean }) {
  const [pending, start] = useTransition()
  return (
    <Switch
      checked={active}
      disabled={locked || pending}
      aria-label={active ? 'إيقاف المكتب' : 'تفعيل المكتب'}
      onCheckedChange={(next) =>
        start(async () => {
          const res = await setOfficeActiveAction(officeId, next)
          if (res.ok) toast.success(next ? 'فُعِّل المكتب' : 'أُوقف المكتب — مستخدموه لا يستطيعون الدخول')
          else toast.error(res.error)
        })
      }
    />
  )
}

export function OfficeSlugEditor({ officeId, slug }: { officeId: string; slug: string | null }) {
  const [value, setValue] = useState(slug ?? '')
  const [pending, start] = useTransition()
  const dirty = value.trim().toLowerCase() !== (slug ?? '')

  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const res = await setOfficeSlugAction(officeId, value)
          if (res.ok) toast.success(value ? `الرابط: ${value}.masryps.com` : 'أُزيل الرابط الخاص')
          else toast.error(res.error)
        })
      }}
    >
      <div className="flex items-center rounded-[var(--radius-app)] border border-input" dir="ltr">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-8 w-28 border-0 px-2 text-xs shadow-none focus-visible:ring-0"
          placeholder="office1"
          aria-label="الرابط الخاص"
        />
        <span className="pe-2 text-xs text-muted-foreground">.masryps.com</span>
      </div>
      {dirty ? (
        <Button type="submit" size="sm" variant="outline" className="h-8" disabled={pending}>
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Link2 className="size-3.5" />}
          حفظ
        </Button>
      ) : null}
    </form>
  )
}
