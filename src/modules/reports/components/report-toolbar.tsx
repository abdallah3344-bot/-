'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Printer, FileSpreadsheet, Filter, X, Loader2 } from 'lucide-react'
import type { ReportDefinition } from '../definitions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { CASE_STATUSES, CASE_STATUS_LABELS, INVOICE_STATUSES, INVOICE_STATUS_LABELS }
  from '@/lib/constants/enums'

const ALL = '__all__'

export type FilterOptions = {
  lawyers: { id: string; full_name: string }[]
  courts: { id: string; name_ar: string }[]
  caseTypes: { id: string; name_ar: string }[]
  clients: { id: string; name: string }[]
}

type Props = {
  report: ReportDefinition
  options: FilterOptions
  rows: Record<string, string | number | null>[]
  canPrint: boolean
  canExport: boolean
}

export function ReportToolbar({ report, options, rows, canPrint, canExport }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [showFilters, setShowFilters] = useState(false)

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (!value || value === ALL) params.delete(key)
    else params.set(key, value)
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  function clearAll() {
    startTransition(() => router.push(pathname))
  }

  /**
   * تصدير إلى CSV يفتحه Excel مباشرة.
   * نُضيف BOM حتى يقرأ Excel العربية بترميز UTF-8 بدل أن يعرضها رموزًا،
   * ونُهرّب علامات التنصيص داخل الخلايا.
   */
  function exportCsv() {
    const headers = report.columns.map((c) => c.header)
    const escape = (value: unknown) => {
      const text = value === null || value === undefined ? '' : String(value)
      return `"${text.replace(/"/g, '""')}"`
    }

    const lines = [
      headers.map(escape).join(','),
      ...rows.map((row) => report.columns.map((c) => escape(row[c.key])).join(',')),
    ]

    const blob = new Blob(['﻿' + lines.join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${report.slug}-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const activeCount = [...searchParams.keys()].length

  return (
    <div className="mb-5 space-y-3 no-print">
      <div className="flex flex-wrap items-center gap-2">
        {report.dateRange || (report.filters?.length ?? 0) > 0 ? (
          <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)}>
            <Filter className="size-4" />
            التصفية {activeCount > 0 ? `(${activeCount})` : ''}
          </Button>
        ) : null}

        {activeCount > 0 ? (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <X className="size-4" />
            مسح
          </Button>
        ) : null}

        {isPending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}

        <span className="ms-auto flex gap-2">
          {canExport ? (
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
              <FileSpreadsheet className="size-4" />
              تصدير Excel
            </Button>
          ) : null}
          {canPrint ? (
            <Button variant="outline" size="sm" onClick={() => window.print()}
                    disabled={rows.length === 0}>
              <Printer className="size-4" />
              طباعة / PDF
            </Button>
          ) : null}
        </span>
      </div>

      {showFilters ? (
        <div className="grid gap-4 rounded-[var(--radius-app)] border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
          {report.dateRange ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="from">من تاريخ</Label>
                <Input id="from" type="date" defaultValue={searchParams.get('from') ?? ''}
                       onChange={(e) => setParam('from', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to">إلى تاريخ</Label>
                <Input id="to" type="date" defaultValue={searchParams.get('to') ?? ''}
                       onChange={(e) => setParam('to', e.target.value)} />
              </div>
            </>
          ) : null}

          {report.filters?.includes('lawyer') ? (
            <FilterSelect
              id="lawyer" label="المحامي" value={searchParams.get('lawyer')}
              onChange={(v) => setParam('lawyer', v)}
              items={options.lawyers.map((l) => ({ value: l.id, label: l.full_name }))}
            />
          ) : null}

          {report.filters?.includes('court') ? (
            <FilterSelect
              id="court" label="المحكمة" value={searchParams.get('court')}
              onChange={(v) => setParam('court', v)}
              items={options.courts.map((c) => ({ value: c.id, label: c.name_ar }))}
            />
          ) : null}

          {report.filters?.includes('caseType') ? (
            <FilterSelect
              id="caseType" label="نوع القضية" value={searchParams.get('caseType')}
              onChange={(v) => setParam('caseType', v)}
              items={options.caseTypes.map((t) => ({ value: t.id, label: t.name_ar }))}
            />
          ) : null}

          {report.filters?.includes('client') ? (
            <FilterSelect
              id="client" label="العميل" value={searchParams.get('client')}
              onChange={(v) => setParam('client', v)}
              items={options.clients.map((c) => ({ value: c.id, label: c.name }))}
            />
          ) : null}

          {report.filters?.includes('status') ? (
            <FilterSelect
              id="status" label="الحالة" value={searchParams.get('status')}
              onChange={(v) => setParam('status', v)}
              items={
                report.group === 'finance'
                  ? INVOICE_STATUSES.map((s) => ({ value: s, label: INVOICE_STATUS_LABELS[s] }))
                  : CASE_STATUSES.map((s) => ({ value: s, label: CASE_STATUS_LABELS[s] }))
              }
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function FilterSelect({
  id, label, value, onChange, items,
}: {
  id: string
  label: string
  value: string | null
  onChange: (value: string) => void
  items: { value: string; label: string }[]
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value ?? ALL} onValueChange={onChange}>
        <SelectTrigger id={id}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>الكل</SelectItem>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
