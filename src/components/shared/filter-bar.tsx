'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'

export type FilterOption = { value: string; label: string }

export type FilterDef = {
  /** اسم الوسيط في الرابط */
  name: string
  label: string
  options: FilterOption[]
}

type Props = {
  searchPlaceholder?: string
  filters?: FilterDef[]
}

const ALL = '__all__'

/**
 * شريط بحث وتصفية يكتب الحالة في الرابط (URL).
 * وضع الحالة في الرابط يجعل النتيجة قابلة للمشاركة والحفظ،
 * ويبقيها سليمة بعد تحديث الصفحة.
 */
export function FilterBar({ searchPlaceholder = 'بحث...', filters = [] }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [term, setTerm] = useState(searchParams.get('q') ?? '')

  // مزامنة الحقل عند تغيّر الرابط من الخارج (مثل زر الرجوع).
  // التحديث داخل مؤقّت صفري لا في جسم التأثير، تفاديًا للتصيير المتتالي.
  useEffect(() => {
    const next = searchParams.get('q') ?? ''
    const timer = setTimeout(() => {
      setTerm((current) => (current === next ? current : next))
    }, 0)
    return () => clearTimeout(timer)
  }, [searchParams])

  // بحث مؤجّل — لا نُرهق الخادم بكل ضغطة مفتاح
  useEffect(() => {
    const current = searchParams.get('q') ?? ''
    if (term === current) return

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (term.trim()) params.set('q', term.trim())
      else params.delete('q')
      params.delete('page')
      startTransition(() => router.push(`${pathname}?${params.toString()}`))
    }, 350)

    return () => clearTimeout(timer)
  }, [term, searchParams, pathname, router])

  function setFilter(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === ALL) params.delete(name)
    else params.set(name, value)
    params.delete('page')
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  const activeCount =
    (searchParams.get('q') ? 1 : 0) +
    filters.filter((f) => searchParams.get(f.name)).length

  function clearAll() {
    setTerm('')
    startTransition(() => router.push(pathname))
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 no-print">
      <div className="relative min-w-56 flex-1">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="h-10 w-full rounded-[var(--radius-app)] border border-border bg-input ps-9 pe-9 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
        />
        {isPending ? (
          <Loader2 className="absolute end-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {filters.map((filter) => (
        <Select
          key={filter.name}
          value={searchParams.get(filter.name) ?? ALL}
          onValueChange={(v) => setFilter(filter.name, v)}
        >
          <SelectTrigger className="h-10 w-auto min-w-36" aria-label={filter.label}>
            <SelectValue placeholder={filter.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{filter.label}: الكل</SelectItem>
            {filter.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      {activeCount > 0 ? (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          <X className="size-4" />
          مسح التصفية ({activeCount})
        </Button>
      ) : null}
    </div>
  )
}
