'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, LogOut, Monitor, Smartphone, ShieldCheck } from 'lucide-react'
import { endSessionsAction } from '../actions'
import type { MySession, LoginEntry } from '../queries'
import { describeDevice, isMobileDevice } from '@/lib/device'
import { formatDateTime, timeAgo } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

/**
 * أجهزة الحساب: كل جهاز مفتوح عليه حساب المستخدم الآن، مع إخراج أي منها،
 * وآخر عمليات الدخول. يطمئن المستخدم أن لا أحد غيره يستعمل حسابه.
 */
export function SessionsCard({ sessions, history }: { sessions: MySession[]; history: LoginEntry[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const others = sessions.filter((s) => !s.is_current).length

  const end = (id?: string) => start(async () => {
    const r = await endSessionsAction(id)
    if (r.ok) toast.success(r.message)
    else toast.error(r.error)
    router.refresh()
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-4" /> الأجهزة المفتوحة على حسابك
        </CardTitle>
        <CardDescription className="leading-relaxed">
          كل جهاز يظهر هنا داخل الآن باسم مستخدمك. إن رأيت جهازًا لا تعرفه فأخرجه فورًا وغيّر كلمة المرور.
          حسابك يبقى مفتوحًا على جهازين على الأكثر في الوقت نفسه.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ul className="divide-y rounded-[var(--radius-app)] border">
          {sessions.map((s) => {
            const Icon = isMobileDevice(s.user_agent) ? Smartphone : Monitor
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 font-medium">
                    {describeDevice(s.user_agent)}
                    {s.is_current ? <Badge variant="success">هذا الجهاز</Badge> : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    دخل {formatDateTime(s.created_at)} · آخر نشاط {timeAgo(s.last_active)}
                    {s.ip ? <> · <span dir="ltr">{s.ip}</span></> : null}
                  </div>
                </div>
                {!s.is_current ? (
                  <Button variant="outline" size="sm" disabled={pending} onClick={() => end(s.id)}>
                    <LogOut className="size-4" /> إخراج
                  </Button>
                ) : null}
              </li>
            )
          })}
        </ul>

        <Button variant={others ? 'danger' : 'outline'} disabled={pending || others === 0} onClick={() => end()}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
          إخراج كل الأجهزة الأخرى
        </Button>

        {history.length ? (
          <div>
            <p className="mb-2 text-sm font-medium">آخر عمليات الدخول إلى حسابك</p>
            <ul className="space-y-1.5 text-sm">
              {history.map((h, i) => (
                <li key={`${h.created_at}-${i}`} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
                  <span>{formatDateTime(h.created_at)}</span>
                  <span className="text-muted-foreground">
                    {describeDevice(h.user_agent)}
                    {h.ip ? <> · <span dir="ltr">{h.ip}</span></> : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
