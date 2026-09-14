import Link from 'next/link'
import { AlertTriangle, WifiOff } from 'lucide-react'
import type { LicenseStatus } from '../service'

/** عتبة التنبيه: نُظهر تحذير قرب الانتهاء قبل أسبوعين. */
const WARN_DAYS = 14

/**
 * شريط أعلى الصفحات: يظهر فقط حين يحتاج الترخيص انتباهًا
 * (تعذّر الوصول لخادم التراخيص، أو قرب انتهاء المدة).
 */
export function LicenseBanner({ status }: { status: LicenseStatus }) {
  if (status.degraded) {
    return (
      <div className="no-print mb-4 flex items-start gap-2.5 rounded-[var(--radius-app)] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
        <WifiOff className="size-4 shrink-0 mt-0.5" />
        <span>
          تعذّر الوصول لخادم التراخيص، والنظام يعمل مؤقتًا دون تحقّق.
          سيُعاد التحقق تلقائيًا عند عودة الاتصال.
        </span>
      </div>
    )
  }

  const days = status.daysRemaining
  if (status.isLifetime || days === null || days > WARN_DAYS) return null

  const isTrial = status.licenseType === 'trial'

  return (
    <div className="no-print mb-4 flex items-start gap-2.5 rounded-[var(--radius-app)] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
      <AlertTriangle className="size-4 shrink-0 mt-0.5" />
      <span>
        {isTrial ? 'النسخة التجريبية' : 'الترخيص'} ينتهي خلال{' '}
        <strong>{days <= 0 ? 'أقل من يوم' : `${days} يومًا`}</strong>.{' '}
        <Link href="/settings" className="font-medium underline underline-offset-4">
          راجع حالة الترخيص
        </Link>
      </span>
    </div>
  )
}
