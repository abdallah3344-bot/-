'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type SearchRow = {
  entity_type: string
  id: string
  title: string | null
  subtitle: string | null
  extra: string | null
}

const TYPE_LABELS: Record<string, string> = {
  client: 'العملاء',
  case: 'القضايا',
  hearing: 'الجلسات',
  court: 'المحاكم',
  document: 'المستندات',
  contract: 'العقود',
  poa: 'الوكالات',
  invoice: 'الفواتير',
  payment: 'المقبوضات',
}

const TYPE_ROUTES: Record<string, string> = {
  client: '/clients',
  case: '/cases',
  hearing: '/hearings',
  court: '/settings/courts',
  document: '/documents',
  contract: '/contracts',
  poa: '/powers-of-attorney',
  invoice: '/invoices',
  payment: '/payments',
}

export function GlobalSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchRow[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // اختصار لوحة المفاتيح: Ctrl/Cmd + K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // إغلاق عند النقر خارج الصندوق
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // بحث مؤجّل
  useEffect(() => {
    const term = query.trim()

    // كل تحديث للحالة يجري داخل مؤقّت أو بعد انتظار، لا في جسم التأثير
    // مباشرة، تفاديًا للتصيير المتتالي.
    const timer = setTimeout(async () => {
      if (term.length < 2) {
        setResults([])
        setLoading(false)
        return
      }

      setLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase.rpc('global_search', {
        q: term,
        max_per_type: 5,
      } as never)

      if (!error && Array.isArray(data)) {
        setResults(data as SearchRow[])
        setOpen(true)
      }
      setLoading(false)
    }, 280)

    return () => clearTimeout(timer)
  }, [query])

  const grouped = results.reduce<Record<string, SearchRow[]>>((acc, row) => {
    ;(acc[row.entity_type] ??= []).push(row)
    return acc
  }, {})

  function go(row: SearchRow) {
    const base = TYPE_ROUTES[row.entity_type]
    if (base) router.push(`${base}/${row.id}`)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xl">
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="ابحث عن عميل، قضية، جلسة، مستند..."
          className={cn(
            'h-10 w-full rounded-[var(--radius-app)] border border-border bg-surface-muted ps-9 pe-16 text-sm',
            'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring',
          )}
          aria-label="البحث الموحّد"
        />
        <div className="absolute end-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {loading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
          {query ? (
            <button onClick={() => { setQuery(''); setResults([]) }} aria-label="مسح البحث">
              <X className="size-4 text-muted-foreground hover:text-foreground" />
            </button>
          ) : (
            <kbd className="hidden rounded border border-border px-1.5 text-[10px] text-muted-foreground sm:block">
              Ctrl K
            </kbd>
          )}
        </div>
      </div>

      {open && query.trim().length >= 2 ? (
        <div className="absolute inset-x-0 top-12 z-50 max-h-96 overflow-y-auto rounded-[var(--radius-app)] border border-border bg-surface shadow-xl">
          {results.length === 0 && !loading ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              لا توجد نتائج مطابقة لـ «{query}»
            </p>
          ) : (
            Object.entries(grouped).map(([type, rows]) => (
              <div key={type} className="border-b border-border last:border-0">
                <p className="bg-surface-muted px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
                  {TYPE_LABELS[type] ?? type}
                </p>
                <ul>
                  {rows.map((row) => (
                    <li key={`${type}-${row.id}`}>
                      <button
                        onClick={() => go(row)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-start hover:bg-surface-muted"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm">{row.title ?? '—'}</span>
                          {row.subtitle ? (
                            <span className="block truncate text-xs text-muted-foreground tabular">
                              {row.subtitle}
                            </span>
                          ) : null}
                        </span>
                        {row.extra ? (
                          <span className="shrink-0 text-xs text-muted-foreground tabular">
                            {row.extra}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
