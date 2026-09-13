import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

type Props = {
  name: string
  label: string
  error?: string
  hint?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}

/** غلاف موحّد لحقول النماذج: تسمية + تلميح + رسالة خطأ مرتبطة بالحقل. */
export function FormField({
  name, label, error, hint, required, className, children,
}: Props) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={name}>
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </Label>
      {children}
      {hint && !error ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p id={`${name}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/** شريط خطأ عام أعلى النموذج. */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <div
      data-form-error
      role="alert"
      aria-live="assertive"
      className="rounded-[var(--radius-app)] border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
    >
      {message}
    </div>
  )
}
