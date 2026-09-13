import { cn } from '@/lib/utils'

export type DetailItem = {
  label: string
  value: React.ReactNode
  /** يعرض القيمة بالاتجاه اللاتيني — للأرقام والبريد. */
  ltr?: boolean
  full?: boolean
}

/** قائمة تسمية/قيمة موحّدة لصفحات التفاصيل. */
export function DetailList({ items, columns = 2 }: { items: DetailItem[]; columns?: 1 | 2 | 3 }) {
  return (
    <dl
      className={cn(
        'grid gap-x-6 gap-y-4',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'sm:grid-cols-2',
        columns === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
      )}
    >
      {items.map((item, i) => (
        <div key={i} className={cn('min-w-0', item.full && 'sm:col-span-full')}>
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd
            className={cn('mt-0.5 text-sm break-words', item.ltr && 'tabular')}
            dir={item.ltr ? 'ltr' : undefined}
            style={item.ltr ? { textAlign: 'start' } : undefined}
          >
            {item.value || '—'}
          </dd>
        </div>
      ))}
    </dl>
  )
}
