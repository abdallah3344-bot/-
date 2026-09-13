'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Save, Plus, Trash2 } from 'lucide-react'
import { saveInvoiceAction } from '../actions'
import type { ActionResult } from '@/modules/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { FormField, FormError } from '@/components/shared/form-field'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { INVOICE_STATUSES, INVOICE_STATUS_LABELS } from '@/lib/constants/enums'
import { formatMoney } from '@/lib/utils'

const NONE = '__none__'
const initialState: ActionResult = { ok: true }

type Item = { description: string; quantity: string; unitPrice: string }

type Props = {
  options: {
    clients: { id: string; name: string }[]
    cases: { id: string; title: string; internal_no: string }[]
  }
  defaultTaxRate: number
  taxEnabled: boolean
  currencySymbol: string
  defaults?: {
    id: string
    clientId: string
    caseId: string | null
    issueDate: string
    dueDate: string | null
    discount: string
    taxRate: string
    status: string
    notes: string | null
    items: Item[]
  }
}

export function InvoiceForm({
  options, defaultTaxRate, taxEnabled, currencySymbol, defaults,
}: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(saveInvoiceAction, initialState)

  const [items, setItems] = useState<Item[]>(
    defaults?.items?.length
      ? defaults.items
      : [{ description: '', quantity: '1', unitPrice: '' }],
  )
  const [discount, setDiscount] = useState(defaults?.discount ?? '0')
  const [taxRate, setTaxRate] = useState(
    defaults?.taxRate ?? (taxEnabled ? String(defaultTaxRate) : '0'),
  )

  useEffect(() => {
    if (state.ok && state.message) {
      toast.success(state.message)
      const created = (state as ActionResult & { id?: string }).id
      if (created) router.push(`/invoices/${created}`)
      else router.refresh()
    }
  }, [state, router])

  // الإجماليات تُحسب هنا للعرض الفوري، وتُعاد بدقة في قاعدة البيانات
  // عبر محفّزات على invoice_items — القاعدة هي مصدر الحقيقة.
  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      const q = Number(item.quantity) || 0
      const p = Number(item.unitPrice) || 0
      return sum + q * p
    }, 0)
    const disc = Math.min(Number(discount) || 0, subtotal)
    const taxable = subtotal - disc
    const tax = Math.round(taxable * (Number(taxRate) || 0)) / 100
    return { subtotal, discount: disc, tax, total: taxable + tax }
  }, [items, discount, taxRate])

  const err = (name: string) => (!state.ok ? state.fieldErrors?.[name] : undefined)

  function updateItem(index: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {defaults?.id ? <input type="hidden" name="id" value={defaults.id} /> : null}
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <FormError message={!state.ok ? state.error : null} />

      <Card>
        <CardHeader><CardTitle>بيانات الفاتورة</CardTitle></CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <FormField name="clientId" label="العميل" required error={err('clientId')}>
            <Select name="clientId" defaultValue={defaults?.clientId ?? NONE}>
              <SelectTrigger id="clientId" aria-invalid={Boolean(err('clientId'))}>
                <SelectValue placeholder="اختر العميل" />
              </SelectTrigger>
              <SelectContent>
                {options.clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField name="caseId" label="القضية" error={err('caseId')}>
            <Select name="caseId" defaultValue={defaults?.caseId ?? NONE}>
              <SelectTrigger id="caseId"><SelectValue placeholder="غير مرتبطة بقضية" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>غير مرتبطة بقضية</SelectItem>
                {options.cases.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.title} — {c.internal_no}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField name="issueDate" label="تاريخ الإصدار" required error={err('issueDate')}>
            <Input id="issueDate" name="issueDate" type="date"
                   defaultValue={defaults?.issueDate ?? new Date().toISOString().slice(0, 10)} />
          </FormField>

          <FormField name="dueDate" label="تاريخ الاستحقاق" error={err('dueDate')}>
            <Input id="dueDate" name="dueDate" type="date" defaultValue={defaults?.dueDate ?? ''} />
          </FormField>

          <FormField name="status" label="الحالة" required error={err('status')}>
            <Select name="status" defaultValue={defaults?.status ?? 'issued'}>
              <SelectTrigger id="status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INVOICE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{INVOICE_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>بنود الفاتورة</CardTitle>
          <Button type="button" variant="outline" size="sm"
                  onClick={() => setItems((p) => [...p, { description: '', quantity: '1', unitPrice: '' }])}>
            <Plus className="size-4" />
            إضافة بند
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          {err('items') ? <p className="text-xs text-danger">{err('items')}</p> : null}

          {items.map((item, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-12 sm:items-end">
              <div className="sm:col-span-6">
                <label className="mb-1.5 block text-xs text-muted-foreground"
                       htmlFor={`item-desc-${index}`}>
                  وصف الخدمة
                </label>
                <Input
                  id={`item-desc-${index}`}
                  value={item.description}
                  onChange={(e) => updateItem(index, { description: e.target.value })}
                  placeholder="مثال: أتعاب مرافعة أمام محكمة الاستئناف"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs text-muted-foreground"
                       htmlFor={`item-qty-${index}`}>
                  الكمية
                </label>
                <Input
                  id={`item-qty-${index}`} type="number" step="0.01" min="0.01"
                  dir="ltr" className="text-start"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, { quantity: e.target.value })}
                />
              </div>

              <div className="sm:col-span-3">
                <label className="mb-1.5 block text-xs text-muted-foreground"
                       htmlFor={`item-price-${index}`}>
                  سعر الوحدة
                </label>
                <Input
                  id={`item-price-${index}`} type="number" step="0.01" min="0"
                  dir="ltr" className="text-start"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(index, { unitPrice: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="sm:col-span-1">
                <Button
                  type="button" variant="ghost" size="icon"
                  onClick={() => setItems((p) => p.filter((_, i) => i !== index))}
                  disabled={items.length === 1}
                  aria-label={`حذف البند ${index + 1}`}
                >
                  <Trash2 className="size-4 text-danger" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>الإجماليات</CardTitle></CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <FormField name="discount" label="الخصم" error={err('discount')}>
            <Input id="discount" name="discount" type="number" step="0.01" min="0"
                   dir="ltr" className="text-start"
                   value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </FormField>

          <FormField
            name="taxRate" label="نسبة الضريبة %" error={err('taxRate')}
            hint={taxEnabled ? undefined : 'الضريبة غير مفعّلة في إعدادات المكتب'}
          >
            <Input id="taxRate" name="taxRate" type="number" step="0.01" min="0" max="100"
                   dir="ltr" className="text-start"
                   value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
          </FormField>

          <FormField name="notes" label="ملاحظات الفاتورة" error={err('notes')}
                     className="sm:col-span-2">
            <Textarea id="notes" name="notes" rows={2} defaultValue={defaults?.notes ?? ''} />
          </FormField>

          <dl className="sm:col-span-2 space-y-2 rounded-lg bg-surface-muted p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">المجموع الفرعي</dt>
              <dd className="tabular font-medium">{formatMoney(totals.subtotal, currencySymbol)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">الخصم</dt>
              <dd className="tabular">− {formatMoney(totals.discount, currencySymbol)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">الضريبة ({taxRate || 0}%)</dt>
              <dd className="tabular">{formatMoney(totals.tax, currencySymbol)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
              <dt>الإجمالي</dt>
              <dd className="tabular">{formatMoney(totals.total, currencySymbol)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {defaults?.id ? 'حفظ التعديلات' : 'إصدار الفاتورة'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          إلغاء
        </Button>
      </div>
    </form>
  )
}
