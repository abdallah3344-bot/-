'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import { saveSettingsAction } from '../actions'
import type { ActionResult } from '@/modules/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { FormField, FormError } from '@/components/shared/form-field'
import { CURRENCIES, DEFAULT_CURRENCY_CODE } from '@/lib/constants/currencies'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

const initialState: ActionResult = { ok: true }

type Settings = Record<string, unknown>

function text(settings: Settings, key: string, fallback = ''): string {
  const value = settings[key]
  return value === null || value === undefined ? fallback : String(value)
}

export function OfficeSettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(saveSettingsAction, initialState)

  useEffect(() => {
    if (state.ok && state.message) {
      toast.success(state.message)
      router.refresh()
    }
  }, [state, router])

  const err = (name: string) => (!state.ok ? state.fieldErrors?.[name] : undefined)

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormError message={!state.ok && !state.fieldErrors ? state.error : null} />

      <Card>
        <CardHeader>
          <CardTitle>بيانات المكتب</CardTitle>
          <CardDescription>تظهر في الفواتير وسندات القبض والتقارير المطبوعة</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <FormField name="officeName" label="اسم المكتب" required error={err('officeName')}
                     className="sm:col-span-2">
            <Input id="officeName" name="officeName" defaultValue={text(settings, 'office_name')}
                   aria-invalid={Boolean(err('officeName'))} />
          </FormField>

          <FormField name="officeAddress" label="العنوان" error={err('officeAddress')}
                     className="sm:col-span-2">
            <Input id="officeAddress" name="officeAddress"
                   defaultValue={text(settings, 'office_address')} />
          </FormField>

          <FormField name="officePhone" label="الهاتف" error={err('officePhone')}>
            <Input id="officePhone" name="officePhone" dir="ltr" className="text-start"
                   defaultValue={text(settings, 'office_phone')} />
          </FormField>

          <FormField name="officeEmail" label="البريد الإلكتروني" error={err('officeEmail')}>
            <Input id="officeEmail" name="officeEmail" type="email" dir="ltr" className="text-start"
                   defaultValue={text(settings, 'office_email')}
                   aria-invalid={Boolean(err('officeEmail'))} />
          </FormField>

          <FormField name="officeWebsite" label="الموقع الإلكتروني" error={err('officeWebsite')}>
            <Input id="officeWebsite" name="officeWebsite" dir="ltr" className="text-start"
                   defaultValue={text(settings, 'office_website')} />
          </FormField>

          <FormField name="taxNumber" label="الرقم الضريبي" error={err('taxNumber')}>
            <Input id="taxNumber" name="taxNumber" dir="ltr" className="text-start"
                   defaultValue={text(settings, 'tax_number')} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>العملة والضريبة</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <FormField name="currencyCode" label="العملة" required error={err('currencyCode')}
                     hint="تظهر بجانب كل مبلغ، وتُستعمل في تفقيط الإيصالات">
            <Select name="currencyCode"
                    defaultValue={text(settings, 'currency_code', DEFAULT_CURRENCY_CODE)}>
              <SelectTrigger id="currencyCode"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.nameAr} — {currency.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <div className="space-y-2">
            <Label htmlFor="taxEnabled">تفعيل الضريبة</Label>
            <div className="flex h-10 items-center gap-3">
              <Switch id="taxEnabled" name="taxEnabled"
                      defaultChecked={Boolean(settings.tax_enabled)} />
              <span className="text-sm text-muted-foreground">
                تُضاف تلقائيًا للفواتير الجديدة
              </span>
            </div>
          </div>

          <FormField name="taxRate" label="نسبة الضريبة %" error={err('taxRate')}>
            <Input id="taxRate" name="taxRate" type="number" step="0.01" min="0" max="100"
                   dir="ltr" className="text-start"
                   defaultValue={text(settings, 'tax_rate', '15')}
                   aria-invalid={Boolean(err('taxRate'))} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>بادئات الترقيم</CardTitle>
          <CardDescription>
            تُستخدم في توليد الأرقام التسلسلية. تغييرها يؤثر على السجلات الجديدة فقط.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-4">
          <FormField name="clientPrefix" label="العملاء" required error={err('clientPrefix')}>
            <Input id="clientPrefix" name="clientPrefix" dir="ltr" className="text-start"
                   defaultValue={text(settings, 'client_prefix', 'CL')} />
          </FormField>
          <FormField name="casePrefix" label="القضايا" required error={err('casePrefix')}>
            <Input id="casePrefix" name="casePrefix" dir="ltr" className="text-start"
                   defaultValue={text(settings, 'case_prefix', 'CS')} />
          </FormField>
          <FormField name="invoicePrefix" label="الفواتير" required error={err('invoicePrefix')}>
            <Input id="invoicePrefix" name="invoicePrefix" dir="ltr" className="text-start"
                   defaultValue={text(settings, 'invoice_prefix', 'INV')} />
          </FormField>
          <FormField name="receiptPrefix" label="الإيصالات" required error={err('receiptPrefix')}>
            <Input id="receiptPrefix" name="receiptPrefix" dir="ltr" className="text-start"
                   defaultValue={text(settings, 'receipt_prefix', 'REC')} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الحساب البنكي وملاحظات الفاتورة</CardTitle>
          <CardDescription>تظهر في تذييل كل فاتورة مطبوعة</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <FormField name="bankName" label="اسم البنك" error={err('bankName')}>
            <Input id="bankName" name="bankName" defaultValue={text(settings, 'bank_name')} />
          </FormField>

          <FormField name="bankAccountName" label="اسم الحساب" error={err('bankAccountName')}>
            <Input id="bankAccountName" name="bankAccountName"
                   defaultValue={text(settings, 'bank_account_name')} />
          </FormField>

          <FormField name="bankAccountNumber" label="رقم الحساب" error={err('bankAccountNumber')}>
            <Input id="bankAccountNumber" name="bankAccountNumber" dir="ltr" className="text-start"
                   defaultValue={text(settings, 'bank_account_number')} />
          </FormField>

          <FormField name="bankIban" label="الآيبان" error={err('bankIban')}>
            <Input id="bankIban" name="bankIban" dir="ltr" className="text-start"
                   defaultValue={text(settings, 'bank_iban')} />
          </FormField>

          <FormField name="invoiceNotes" label="ملاحظات تظهر في كل فاتورة"
                     error={err('invoiceNotes')} className="sm:col-span-2">
            <Textarea id="invoiceNotes" name="invoiceNotes" rows={2}
                      defaultValue={text(settings, 'invoice_notes')} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>النسخ الاحتياطي</CardTitle>
          <CardDescription>
            قاعدة البيانات على Supabase تُنسخ احتياطيًا يوميًا على مستوى المزوّد.
            هذا الإعداد يحدّد دورية التذكير بالتصدير اليدوي من تبويب «النسخ الاحتياطي».
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormField name="backupFrequency" label="دورية النسخ" error={err('backupFrequency')}>
            <Select name="backupFrequency"
                    defaultValue={text(settings, 'backup_frequency', 'daily')}>
              <SelectTrigger id="backupFrequency" className="max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">يومي</SelectItem>
                <SelectItem value="weekly">أسبوعي</SelectItem>
                <SelectItem value="monthly">شهري</SelectItem>
                <SelectItem value="off">معطّل</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </CardContent>
      </Card>

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        حفظ الإعدادات
      </Button>
    </form>
  )
}
