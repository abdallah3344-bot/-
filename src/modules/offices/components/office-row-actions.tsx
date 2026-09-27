'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Link2, RefreshCw, ExternalLink } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { setOfficeActiveAction, setOfficeSlugAction, retryOfficeDomainAction } from '../actions'

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

const DOMAIN_LABEL: Record<string, { text: string; cls: string }> = {
  active: { text: 'يعمل', cls: 'text-emerald-700 dark:text-emerald-400' },
  pending: { text: 'بانتظار الربط', cls: 'text-amber-700 dark:text-amber-400' },
  failed: { text: 'فشل الربط', cls: 'text-destructive' },
}

export function OfficeSlugEditor({ officeId, slug, status, error }: {
  officeId: string; slug: string | null; status: string; error: string | null
}) {
  const [value, setValue] = useState(slug ?? '')
  const [pending, start] = useTransition()
  const dirty = value.trim().toLowerCase() !== (slug ?? '')

  return (
    <div className="space-y-1">
    <form
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const res = await setOfficeSlugAction(officeId, value)
          if (!res.ok) toast.error(res.error)
          else if (res.warning) toast.warning(`حُفظ الرابط لكن لم يُربط: ${res.warning}`)
          else toast.success(value ? `الرابط: ${value}.masryps.com` : 'أُزيل الرابط الخاص')
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
    {slug && !dirty ? (
      <div className="flex items-center gap-2 text-xs">
        <span className={DOMAIN_LABEL[status]?.cls} title={error ?? undefined}>{DOMAIN_LABEL[status]?.text ?? status}</span>
        {status === 'active' ? (
          <a href={`https://${slug}.masryps.com`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground">
            فتح <ExternalLink className="size-3" />
          </a>
        ) : (
          <button type="button" disabled={pending} className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground"
            onClick={() => start(async () => {
              const res = await retryOfficeDomainAction(officeId, slug)
              if (res.ok) toast.success('رُبط الرابط — يعمل خلال دقيقة أو دقيقتين')
              else toast.error(res.error)
            })}>
            <RefreshCw className="size-3" /> ربط الآن
          </button>
        )}
      </div>
    ) : null}
    {slug && !dirty && status === 'failed' && error ? <p className="max-w-56 text-[11px] text-destructive">{error}</p> : null}
    </div>
  )
}
