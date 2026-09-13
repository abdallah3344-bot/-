import Link from 'next/link'
import { ShieldAlert, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MODULE_LABELS, ACTION_LABELS, type Module, type Action } from '@/lib/auth/permissions'

export const metadata = { title: 'لا تملك الصلاحية' }

export default async function ForbiddenPage({
  searchParams,
}: {
  searchParams: Promise<{ module?: string; action?: string }>
}) {
  const { module, action } = await searchParams

  const moduleLabel = module && module in MODULE_LABELS
    ? MODULE_LABELS[module as Module]
    : null
  const actionLabel = action && action in ACTION_LABELS
    ? ACTION_LABELS[action as Action]
    : null

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
          <ShieldAlert className="size-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">لا تملك صلاحية الوصول</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {moduleLabel && actionLabel
              ? `حسابك لا يملك صلاحية «${actionLabel}» على وحدة «${moduleLabel}».`
              : 'حسابك لا يملك الصلاحية اللازمة لفتح هذه الصفحة.'}
            <br />
            راجع مدير النظام إذا كنت تعتقد أن هذا خطأ.
          </p>
        </div>

        <Button asChild>
          <Link href="/dashboard">
            <ArrowRight className="size-4" />
            العودة للوحة التحكم
          </Link>
        </Button>
      </div>
    </div>
  )
}
