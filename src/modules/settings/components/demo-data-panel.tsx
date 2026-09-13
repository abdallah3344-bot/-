'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Database, Trash2, TriangleAlert } from 'lucide-react'
import { seedDemoDataAction, clearDemoDataAction } from '../demo-actions'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Badge } from '@/components/ui/badge'

export function DemoDataPanel({ demoCount }: { demoCount: number }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function seed() {
    startTransition(async () => {
      const result = await seedDemoDataAction()
      if (result.ok) {
        toast.success(result.message ?? 'تم')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="size-4" />
          البيانات التجريبية
          {demoCount > 0 ? <Badge variant="warning">{demoCount} عميل تجريبي</Badge> : null}
        </CardTitle>
        <CardDescription>
          بيانات جاهزة لتجربة النظام: خمسة عملاء وخمس قضايا بجلسات ومهام وأتعاب
          وفواتير ودفعات ومصروفات ومراسلات. كلها موسومة داخليًا كبيانات تجريبية،
          فيمكن حذفها دفعة واحدة دون المساس بأي بيانات حقيقية أدخلتها.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {demoCount > 0 ? (
          <div className="flex items-start gap-2.5 rounded-[var(--radius-app)] border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" />
            <p>
              يحتوي النظام على بيانات تجريبية. احذفها قبل بدء الاستخدام الفعلي
              حتى لا تختلط بسجلات المكتب الحقيقية.
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button onClick={seed} disabled={pending || demoCount > 0} variant="outline">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Database className="size-4" />}
            توليد بيانات تجريبية
          </Button>

          {demoCount > 0 ? (
            <ConfirmDialog
              title="حذف البيانات التجريبية"
              description="سيتم حذف كل البيانات التجريبية فقط — العملاء والقضايا والجلسات والمهام والفواتير والدفعات والمصروفات والمراسلات الموسومة كتجريبية. بياناتك الحقيقية لن تتأثر."
              confirmLabel="حذف البيانات التجريبية"
              action={clearDemoDataAction}
              onDone={() => router.refresh()}
              trigger={
                <Button variant="danger">
                  <Trash2 className="size-4" />
                  حذف البيانات التجريبية
                </Button>
              }
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
