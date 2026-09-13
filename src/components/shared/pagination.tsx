'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  page: number
  pageSize: number
  total: number
}

export function Pagination({ page, pageSize, total }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (total === 0) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  function goTo(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString())
    if (nextPage <= 1) params.delete('page')
    else params.set('page', String(nextPage))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 no-print">
      <p className="text-xs text-muted-foreground tabular">
        عرض {from}–{to} من {total}
      </p>

      <div className="flex items-center gap-1">
        {/* في RTL يشير «السابق» لليمين */}
        <Button
          variant="outline" size="sm"
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
          aria-label="الصفحة السابقة"
        >
          <ChevronRight className="size-4" />
          السابق
        </Button>

        <span className="px-3 text-xs text-muted-foreground tabular">
          {page} / {totalPages}
        </span>

        <Button
          variant="outline" size="sm"
          onClick={() => goTo(page + 1)}
          disabled={page >= totalPages}
          aria-label="الصفحة التالية"
        >
          التالي
          <ChevronLeft className="size-4" />
        </Button>
      </div>
    </div>
  )
}
