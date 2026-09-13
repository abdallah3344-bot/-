import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import { EmptyState } from './empty-state'

export type Column<T> = {
  key: string
  header: string
  /** محاذاة العمود — الأرقام والمبالغ تُحاذى لليسار داخل RTL. */
  align?: 'start' | 'end' | 'center'
  className?: string
  cell: (row: T) => React.ReactNode
  /** إخفاء العمود على الشاشات الصغيرة لتفادي التمرير الأفقي. */
  hideBelow?: 'sm' | 'md' | 'lg'
}

const HIDE_CLASSES = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
} as const

type Props<T> = {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  /** رابط صف قابل للنقر — يجعل الصف كله يفتح التفاصيل. */
  rowHref?: (row: T) => string
  emptyIcon?: string
  emptyTitle: string
  emptyDescription?: string
  emptyAction?: React.ReactNode
}

export function DataTable<T>({
  rows, columns, rowKey, rowHref,
  emptyIcon, emptyTitle, emptyDescription, emptyAction,
}: Props<T>) {
  if (rows.length === 0) {
    return (
      <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription}>
        {emptyAction}
      </EmptyState>
    )
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-app)] border border-border bg-surface">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  col.align === 'end' && 'text-end',
                  col.align === 'center' && 'text-center',
                  col.hideBelow && HIDE_CLASSES[col.hideBelow],
                  col.className,
                )}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map((row) => {
            const href = rowHref?.(row)
            return (
              <TableRow key={rowKey(row)} className={href ? 'cursor-pointer' : undefined}>
                {columns.map((col, i) => {
                  const content = col.cell(row)
                  return (
                    <TableCell
                      key={col.key}
                      className={cn(
                        col.align === 'end' && 'text-end',
                        col.align === 'center' && 'text-center',
                        col.hideBelow && HIDE_CLASSES[col.hideBelow],
                        col.className,
                      )}
                    >
                      {/* الرابط يغلّف الخلية الأولى فقط حتى تبقى أزرار
                          الإجراءات في آخر عمود قابلة للنقر بشكل مستقل. */}
                      {href && i === 0 ? (
                        <Link href={href} className="block hover:text-gold-600">
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
