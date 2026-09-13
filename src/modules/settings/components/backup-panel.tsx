'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Download, Loader2, Database, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

const TABLE_COUNT = 25

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري', off: 'معطّل',
}

export function BackupPanel({ frequency }: { frequency: string }) {
  const [pending, setPending] = useState(false)

  /**
   * يطلب النسخة من الخادم ويحفظها كملف.
   * الخادم يجمع كل الجداول في طلب واحد، فلا يعتمد نجاح النسخة على
   * خمسة وعشرين طلبًا متتاليًا من المتصفح.
   */
  async function download() {
    setPending(true)
    try {
      const response = await fetch('/api/backup')

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        toast.error(body?.error ?? 'تعذّر إنشاء النسخة الاحتياطية.')
        return
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `law-office-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('تم تنزيل النسخة الاحتياطية.')
    } catch {
      toast.error('تعذّر الاتصال بالخادم. تحقّق من الشبكة وحاول مجددًا.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-600" />
            النسخ الاحتياطي التلقائي
          </CardTitle>
          <CardDescription>
            قاعدة البيانات مستضافة على Supabase وتُنسخ احتياطيًا يوميًا على مستوى
            المزوّد مع إمكانية الاستعادة الزمنية. لا يحتاج المكتب لأي إجراء يدوي
            لهذه الطبقة.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-muted-foreground">النسخ على مستوى المزوّد</span>
            <span className="font-medium text-emerald-700 dark:text-emerald-400">مفعّل يوميًا</span>
          </p>
          <p className="flex items-center justify-between">
            <span className="text-muted-foreground">دورية التذكير بالتصدير اليدوي</span>
            <span className="font-medium">{FREQUENCY_LABELS[frequency] ?? frequency}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="size-4" />
            تصدير نسخة يدوية
          </CardTitle>
          <CardDescription>
            يُنزّل ملف JSON واحد يحتوي كل بيانات النظام من {TABLE_COUNT} جدولًا.
            احتفظ به خارج الخادم كنسخة مستقلة.
            التصدير يمرّ بصلاحياتك، فلا يشمل بيانات لا تملك صلاحية قراءتها.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={download} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {pending ? 'جارٍ تجهيز النسخة...' : 'تصدير نسخة احتياطية الآن'}
          </Button>

          <p className="text-xs text-muted-foreground">
            ملاحظة: ملفات المستندات المرفوعة تُحفظ في تخزين Supabase ولا تُضمَّن في
            ملف JSON. استعادتها تتم من لوحة Supabase مباشرة.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
