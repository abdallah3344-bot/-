'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'
import {
  CheckCheck, Trash2, Loader2, Gavel, ListChecks, Banknote,
  FileSignature, ScrollText, Receipt, Bell,
} from 'lucide-react'
import { markAllReadAction, markNotificationReadAction, deleteNotificationAction }
  from '../actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/empty-state'
import { timeAgo, cn } from '@/lib/utils'

type Notification = {
  id: string
  kind: string
  title: string
  body: string | null
  link: string | null
  severity: string
  is_read: boolean
  created_at: string
}

const KIND_ICONS: Record<string, typeof Bell> = {
  hearing_today: Gavel,
  hearing_tomorrow: Gavel,
  task_overdue: ListChecks,
  task_due: ListChecks,
  installment_due: Banknote,
  contract_expiring: FileSignature,
  poa_expiring: ScrollText,
  invoice_overdue: Receipt,
}

const SEVERITY_STYLES: Record<string, string> = {
  danger: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  info: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
}

export function NotificationsView({
  notifications, unread,
}: {
  notifications: Notification[]
  unread: number
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function markAll() {
    startTransition(async () => {
      const result = await markAllReadAction()
      if (result.ok) {
        toast.success(result.message ?? 'تم')
        router.refresh()
      } else toast.error(result.error)
    })
  }

  function markOne(id: string) {
    startTransition(async () => {
      await markNotificationReadAction(id)
      router.refresh()
    })
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteNotificationAction(id)
      router.refresh()
    })
  }

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon="Bell"
        title="لا توجد تنبيهات"
        description="ستظهر هنا تنبيهات الجلسات القادمة والمهام المتأخرة والأقساط المستحقة والعقود والوكالات التي توشك على الانتهاء."
      />
    )
  }

  return (
    <div className="space-y-4">
      {unread > 0 ? (
        <Button variant="outline" size="sm" onClick={markAll} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
          تعليم الكل مقروءًا
        </Button>
      ) : null}

      <ul className="space-y-2">
        {notifications.map((notification) => {
          const Icon = KIND_ICONS[notification.kind] ?? Bell
          return (
            <li key={notification.id}>
              <Card className={cn(!notification.is_read && 'border-gold-300 dark:border-gold-700')}>
                <CardContent className="flex items-start gap-3 pt-5">
                  <span
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-lg',
                      SEVERITY_STYLES[notification.severity] ?? SEVERITY_STYLES.info,
                    )}
                  >
                    <Icon className="size-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{notification.title}</span>
                      {!notification.is_read ? (
                        <span className="size-2 shrink-0 rounded-full bg-gold-500"
                              aria-label="غير مقروء" />
                      ) : null}
                    </span>
                    {notification.body ? (
                      <span className="mt-0.5 block text-sm text-muted-foreground">
                        {notification.body}
                      </span>
                    ) : null}
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {timeAgo(notification.created_at)}
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center gap-1">
                    {notification.link ? (
                      <Button variant="ghost" size="sm" asChild
                              onClick={() => markOne(notification.id)}>
                        <Link href={notification.link}>فتح</Link>
                      </Button>
                    ) : null}
                    {!notification.is_read ? (
                      <Button variant="ghost" size="icon" disabled={pending}
                              onClick={() => markOne(notification.id)}
                              aria-label={`تعليم «${notification.title}» مقروءًا`}>
                        <CheckCheck className="size-4" />
                      </Button>
                    ) : null}
                    <Button variant="ghost" size="icon" disabled={pending}
                            onClick={() => remove(notification.id)}
                            aria-label={`حذف «${notification.title}»`}>
                      <Trash2 className="size-4 text-danger" />
                    </Button>
                  </span>
                </CardContent>
              </Card>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
