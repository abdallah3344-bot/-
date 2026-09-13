import { NavIcon } from '@/components/layout/nav-icon'

type Props = {
  icon?: string
  title: string
  description?: string
  children?: React.ReactNode
}

export function EmptyState({ icon = 'FolderOpen', title, description, children }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-app)] border border-dashed border-border bg-surface px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-surface-muted text-muted-foreground">
        <NavIcon name={icon} className="size-6" />
      </span>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description ? (
          <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  )
}
