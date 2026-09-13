import Link from 'next/link'
import { NavIcon } from '@/components/layout/nav-icon'
import { cn } from '@/lib/utils'

type Props = {
  label: string
  value: string | number
  icon: string
  href?: string
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'gold'
  hint?: string
}

const TONES = {
  default: 'bg-navy-50 text-navy-700 dark:bg-navy-800 dark:text-navy-200',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  danger:  'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400',
  gold:    'bg-gold-50 text-gold-700 dark:bg-gold-900/30 dark:text-gold-400',
} as const

export function StatCard({ label, value, icon, href, tone = 'default', hint }: Props) {
  const content = (
    <div
      className={cn(
        'flex items-start gap-4 rounded-[var(--radius-app)] border border-border bg-surface p-4 shadow-sm h-full',
        href && 'transition-colors hover:border-gold-400',
      )}
    >
      <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', TONES[tone])}>
        <NavIcon name={icon} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="block truncate text-2xl font-bold tabular leading-tight mt-0.5">{value}</span>
        {hint ? <span className="block text-[11px] text-muted-foreground mt-0.5">{hint}</span> : null}
      </span>
    </div>
  )

  return href ? <Link href={href} className="block h-full">{content}</Link> : content
}
