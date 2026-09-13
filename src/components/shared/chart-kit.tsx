'use client'

/**
 * أدوات الرسوم البيانية المشتركة.
 *
 * الألوان مأخوذة من لوحة معتمدة اجتازت فحوص عمى الألوان والتباين
 * في الوضعين النهاري والليلي (ΔE للأزواج المتجاورة > 24 في الحالتين).
 * لا تُضف لونًا جديدًا دون إعادة الفحص.
 */

import { useEffect, useState } from 'react'

/** لون السلسلة حسب الوضع — الفتحة الأولى والثانية من اللوحة المعتمدة. */
export const SERIES = {
  light: { primary: '#2a78d6', secondary: '#eb6834' },
  dark:  { primary: '#3987e5', secondary: '#d95926' },
} as const

/** يرصد الوضع الليلي عبر الصنف الذي يضعه next-themes على <html>. */
export function useChartMode(): 'light' | 'dark' {
  const [mode, setMode] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const root = document.documentElement
    const read = () => setMode(root.classList.contains('dark') ? 'dark' : 'light')
    read()

    const observer = new MutationObserver(read)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return mode
}

export function useChartTheme() {
  const mode = useChartMode()
  return {
    mode,
    series: SERIES[mode],
    grid: mode === 'dark' ? '#223257' : '#e2e5ec',
    text: mode === 'dark' ? '#94a3c4' : '#5b6780',
    surface: mode === 'dark' ? '#0f1e3d' : '#ffffff',
  }
}

type TooltipRow = { name?: string; value?: number | string; color?: string }

/** تلميح موحّد — يظهر عند المرور على أي عنصر في الرسم. */
export function ChartTooltip({
  active, payload, label, formatter,
}: {
  active?: boolean
  payload?: TooltipRow[]
  label?: string | number
  formatter?: (value: number | string) => string
}) {
  if (!active || !payload?.length) return null

  return (
    <div
      dir="rtl"
      className="rounded-lg border border-border bg-surface px-3 py-2 shadow-lg text-xs"
    >
      {label !== undefined ? (
        <p className="mb-1 font-medium text-foreground tabular">{label}</p>
      ) : null}
      <ul className="space-y-0.5">
        {payload.map((row, i) => (
          <li key={i} className="flex items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: row.color }}
              aria-hidden
            />
            <span className="text-muted-foreground">{row.name}</span>
            <span className="ms-auto font-semibold text-foreground tabular">
              {formatter && row.value !== undefined
                ? formatter(row.value)
                : String(row.value ?? '')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** وسيلة إيضاح — إلزامية عند وجود سلسلتين أو أكثر. */
export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-4 pt-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          {item.label}
        </li>
      ))}
    </ul>
  )
}
